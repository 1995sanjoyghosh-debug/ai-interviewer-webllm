# rag-bot

A React + Node.js RAG bot using open source Hugging Face models and LangChain embeddings.

## Features
- Upload PDF, DOCX, text files
- Ingest text or web links
- Generate document summaries and answer questions
- Uses LangChain embeddings with Hugging Face sentence-transformers
- Uses Hugging Face inference for open-source LLM completion

## Local setup
1. In `rag-bot`, install dependencies:
   ```bash
   npm install
   cd client
   npm install
   ```
2. Add a `.env` file in `rag-bot` with:
   ```bash
   HUGGINGFACE_API_KEY=your_api_key_here
   HF_COMPLETION_MODEL=google/flan-t5-large
   HF_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
   ```
3. Start both server and client:
   ```bash
   npm run dev
   ```
4. Open the React app at http://localhost:5173

## Production
1. Build frontend:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```
