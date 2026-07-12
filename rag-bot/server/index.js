require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { HuggingFaceInferenceEmbeddings } = require('langchain/embeddings/hf');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });
const hfApiKey = process.env.HUGGINGFACE_API_KEY;
const embeddingModel = process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
const completionModel = process.env.HF_COMPLETION_MODEL || 'google/flan-t5-large';

if (!hfApiKey) {
  console.warn('Missing HUGGINGFACE_API_KEY. Add a .env file with HUGGINGFACE_API_KEY=your_key.');
}

const embedder = new HuggingFaceInferenceEmbeddings({
  model: embeddingModel,
  apiKey: hfApiKey,
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 900,
  chunkOverlap: 120,
});

const documents = {};

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  return normA === 0 || normB === 0 ? 0 : dot / (normA * normB);
}

async function textFromFile(file) {
  const buffer = fs.readFileSync(file.path);
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') {
    const { text } = await pdfParse(buffer);
    return text;
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString('utf8');
}

async function textFromUrl(url) {
  const response = await axios.get(url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  const html = response.data;
  const $ = cheerio.load(html);
  const pageText = $('body').text();
  return pageText.replace(/\s+/g, ' ').trim();
}

async function embedDocumentChunks(text) {
  const chunks = await textSplitter.splitText(text);
  const embeddings = await embedder.embedDocuments(chunks);
  return chunks.map((chunk, index) => ({ text: chunk, embedding: embeddings[index] }));
}

function buildPrompt(question, chunks, history = []) {
  const context = chunks.map((chunk, index) => `Chunk ${index + 1}: ${chunk.text}`).join('\n\n');
  const recentHistory = history.slice(-6).map((entry) => `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`).join('\n');

  return `You are a helpful document chat assistant. Use only the supplied document context. Answer the user question and include inline citations in square brackets such as [1] or [2] to reference the most relevant context chunks. If the document doesn't contain the answer, say that you cannot answer from this document.\n\nConversation history:\n${recentHistory || 'None.'}\n\nRelevant document context:\n${context || 'No relevant context was found.'}\n\nCurrent user question: ${question}\n\nAnswer with citations:`;
}

async function queryModel(prompt) {
  const response = await axios.post(
    `https://api-inference.huggingface.co/models/${completionModel}`,
    { inputs: prompt, parameters: { max_new_tokens: 320, temperature: 0.2 } },
    { headers: { Authorization: `Bearer ${hfApiKey}` } }
  );

  const data = response.data;
  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data[0]?.generated_text || data[0]?.generated_text || '';
  }

  return data.generated_text || JSON.stringify(data);
}

app.post('/api/load', upload.single('file'), async (req, res) => {
  try {
    if (!hfApiKey) {
      return res.status(500).json({ error: 'HUGGINGFACE_API_KEY is not configured. Add it to rag-bot/.env and restart the server.' });
    }

    let text = '';
    let source = 'web link';

    if (req.body.url) {
      source = req.body.url;
      text = await textFromUrl(req.body.url);
    } else {
      return res.status(400).json({ error: 'Please provide a URL in the request body.' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No readable content was found at the provided URL.' });
    }

    const docId = require('crypto').randomUUID();
    const chunks = await embedDocumentChunks(text);

    documents[docId] = {
      source,
      text,
      chunks,
      messages: [],
      createdAt: new Date().toISOString(),
    };

    return res.json({
      docId,
      source,
      chunkCount: chunks.length,
      message: 'Document ingested successfully. You can now ask a question or request a summary.',
    });
  } catch (error) {
    console.error('Load error', error?.message || error);
    return res.status(500).json({ error: 'Failed to ingest document. Check the document format and try again.' });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { docId, question } = req.body;
    const doc = documents[docId];

    if (!doc) {
      return res.status(404).json({ error: 'Document not found. Please upload or ingest again.' });
    }

    const promptQuestion = question && question.trim().length > 0
      ? question.trim()
      : 'Summarize the uploaded document in a few concise paragraphs.';

    const history = Array.isArray(doc.messages) ? doc.messages : [];
    const queryEmbedding = await embedder.embedQuery(promptQuestion);
    const ranked = doc.chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.chunk);

    const prompt = buildPrompt(promptQuestion, ranked, history);
    const answer = await queryModel(prompt);
    const assistantReply = answer.trim();

    doc.messages.push(
      { role: 'user', content: promptQuestion },
      { role: 'assistant', content: assistantReply }
    );

    const citations = ranked.map((chunk, index) => ({
      id: index + 1,
      label: `[${index + 1}]`,
      text: chunk.text.length > 220 ? `${chunk.text.slice(0, 220).trim()}...` : chunk.text,
    }));

    return res.json({
      answer: assistantReply,
      citations,
      history: doc.messages,
    });
  } catch (error) {
    console.error('Query error', error?.message || error);
    return res.status(500).json({ error: 'Failed to generate an answer. Try again in a moment.' });
  }
});

app.post('/api/clear-chat', async (req, res) => {
  try {
    const { docId } = req.body;
    const doc = documents[docId];

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    doc.messages = [];
    return res.json({ success: true, message: 'Chat history cleared.' });
  } catch (error) {
    console.error('Clear chat error', error?.message || error);
    return res.status(500).json({ error: 'Could not clear the chat history.' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', loadedDocuments: Object.keys(documents).length });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`RAG server running on http://localhost:${port}`);
});
