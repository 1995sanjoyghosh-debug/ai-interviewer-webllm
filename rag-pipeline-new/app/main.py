import io
import os
import re
import uuid
from typing import Any, Dict, List, Optional

from bs4 import BeautifulSoup
from docx import Document
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from langchain.embeddings import SentenceTransformerEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from PyPDF2 import PdfReader
import chromadb
from chromadb.config import Settings
import httpx

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(BASE_DIR, "..", "chroma_db")
os.makedirs(CHROMA_DIR, exist_ok=True)

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
COMPLETION_MODEL = os.getenv("HF_COMPLETION_MODEL", "google/flan-t5-large")
EMBEDDING_MODEL = os.getenv("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
COST_PER_1000_COMPLETION_TOKENS = float(os.getenv("COST_PER_1000_COMPLETION_TOKENS", "0.020"))
COST_PER_1000_EMBEDDING_TOKENS = float(os.getenv("COST_PER_1000_EMBEDDING_TOKENS", "0.0004"))

app = FastAPI(
    title="RAG Pipeline",
    version="1.0.0",
    description="FastAPI RAG backend with token and cost monitoring.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = chromadb.Client(
    Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=CHROMA_DIR,
    )
)
collection = client.get_or_create_collection(name="documents")

embedder = SentenceTransformerEmbeddings(model_name=EMBEDDING_MODEL)
text_splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)

documents: Dict[str, Any] = {}


def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    tokens = re.findall(r"\w+|[^\w\s]", text)
    return max(len(tokens), 1)


def estimate_cost(tokens: int, rate_per_1000: float) -> float:
    return round(tokens * rate_per_1000 / 1000.0, 6)


def build_prompt(question: str, chunks: List[str], history: List[Dict[str, str]]) -> str:
    context = "\n\n".join([f"Chunk {idx + 1}: {chunk}" for idx, chunk in enumerate(chunks)])
    recent_history = "\n".join(
        f"{entry['role'].capitalize()}: {entry['content']}" for entry in history[-6:]
    ) or "None."
    return (
        "You are a helpful document chat assistant. Use only the supplied document context. "
        "Answer the user question and include inline citations in square brackets like [1] or [2] "
        "to reference the most relevant context chunks. If the document does not contain the answer, "
        "say that you cannot answer from this document.\n\n"
        f"Conversation history:\n{recent_history}\n\n"
        f"Relevant document context:\n{context or 'No relevant context was found.'}\n\n"
        f"Current user question: {question}\n\n"
        "Answer with citations:"
    )


async def fetch_url_text(url: str) -> str:
    async with httpx.AsyncClient(timeout=20.0) as http_client:
        response = await http_client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        return " ".join(soup.stripped_strings)


def extract_text_from_file(file: UploadFile) -> str:
    content = file.file.read()
    ext = os.path.splitext(file.filename or "")[-1].lower()

    if ext == ".pdf":
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if ext == ".docx":
        document = Document(io.BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    return content.decode("utf-8", errors="ignore")


async def query_model(prompt: str) -> str:
    if not HF_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="HUGGINGFACE_API_KEY is required for completion."
        )

    api_url = f"https://api-inference.huggingface.co/models/{COMPLETION_MODEL}"
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        response = await http_client.post(
            api_url,
            headers={"Authorization": f"Bearer {HF_API_KEY}"},
            json={
                "inputs": prompt,
                "parameters": {"max_new_tokens": 320, "temperature": 0.2},
            },
        )
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list):
            return data[0].get("generated_text", "")
        if isinstance(data, dict):
            return data.get("generated_text", "") or data.get("text", "")
        return str(data)


@app.post("/api/ingest")
async def ingest(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
):
    if not any([file, text, url]):
        raise HTTPException(status_code=400, detail="Provide a file, text, or URL.")

    source = "Unknown"
    if file:
        source = file.filename or "Uploaded file"
        text_data = extract_text_from_file(file)
    elif url:
        source = url.strip()
        text_data = await fetch_url_text(source)
    else:
        source = "Pasted text"
        text_data = text.strip() if text else ""

    if not text_data or not text_data.strip():
        raise HTTPException(status_code=400, detail="No readable content was found.")

    chunks = text_splitter.split_text(text_data)
    embeddings = embedder.embed_documents(chunks)

    ids = [f"{uuid.uuid4()}" for _ in chunks]
    metadatas = [
        {"doc_id": source, "source": source, "chunk_index": idx + 1}
        for idx in range(len(chunks))
    ]

    collection.add(
        ids=ids,
        documents=chunks,
        metadatas=metadatas,
        embeddings=embeddings,
    )

    embedding_tokens = sum(estimate_tokens(chunk) for chunk in chunks)
    embedding_cost = estimate_cost(embedding_tokens, COST_PER_1000_EMBEDDING_TOKENS)

    doc_id = str(uuid.uuid4())
    documents[doc_id] = {
        "source": source,
        "chunk_count": len(chunks),
        "messages": [],
        "usage": {
            "embedding_tokens": embedding_tokens,
            "completion_tokens": 0,
            "estimated_embedding_cost": embedding_cost,
            "estimated_completion_cost": 0.0,
            "estimated_total_cost": embedding_cost,
        },
    }

    return {
        "doc_id": doc_id,
        "source": source,
        "chunk_count": len(chunks),
        "usage": documents[doc_id]["usage"],
        "message": "Document ingested successfully.",
    }


@app.post("/api/query")
async def query(doc_id: str = Form(...), question: str = Form(...)):
    document = documents.get(doc_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    prompt_text = question.strip() or "Summarize the uploaded document in a few concise paragraphs."
    query_embedding = embedder.embed_query(prompt_text)

    query_result = collection.query(
        query_embeddings=[query_embedding],
        n_results=4,
        where={"doc_id": document["source"]},
        include=["documents", "metadatas", "distances"],
    )
    retrieved = query_result.get("documents", [[]])[0]

    relevant_chunks = [chunk for chunk in retrieved if chunk]
    prompt = build_prompt(prompt_text, relevant_chunks, document["messages"])
    answer = await query_model(prompt)

    prompt_tokens = estimate_tokens(prompt)
    response_tokens = estimate_tokens(answer)
    completion_cost = estimate_cost(prompt_tokens + response_tokens, COST_PER_1000_COMPLETION_TOKENS)

    document["messages"].append({"role": "user", "content": prompt_text})
    document["messages"].append({"role": "assistant", "content": answer})
    document["usage"]["completion_tokens"] += prompt_tokens + response_tokens
    document["usage"]["estimated_completion_cost"] += completion_cost
    document["usage"]["estimated_total_cost"] += completion_cost

    citations = [
        {
            "id": idx + 1,
            "label": f"[{idx + 1}]",
            "text": chunk[:220].strip() + ("..." if len(chunk) > 220 else ""),
        }
        for idx, chunk in enumerate(relevant_chunks)
    ]

    return {
        "answer": answer.strip(),
        "citations": citations,
        "usage": document["usage"],
        "history": document["messages"],
    }


@app.post("/api/clear-chat")
async def clear_chat(doc_id: str = Form(...)):
    document = documents.get(doc_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    document["messages"] = []
    return {"success": True}


@app.get("/api/health")
async def health():
    return {"status": "ok", "loaded_documents": len(documents)}


client_dist_dir = os.path.join(BASE_DIR, "..", "client", "dist")
if os.path.isdir(client_dist_dir):
    app.mount("/", StaticFiles(directory=client_dist_dir, html=True), name="static")
