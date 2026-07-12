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
  const response = await axios.get(url, { timeout: 20000 });
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

function buildPrompt(question, chunks) {
  const context = chunks.map((chunk, index) => `Chunk ${index + 1}: ${chunk.text}`).join('\n\n');
  return `You are an assistant that summarizes documents and answers questions using only the supplied document context.\n\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
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
    let text = '';
    let source = 'text';

    if (req.file) {
      source = req.file.originalname || 'uploaded file';
      text = await textFromFile(req.file);
      fs.unlinkSync(req.file.path);
    } else if (req.body.url) {
      source = req.body.url;
      text = await textFromUrl(req.body.url);
    } else if (req.body.text) {
      text = req.body.text;
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No readable content was provided.' });
    }

    const docId = require('crypto').randomUUID();
    const chunks = await embedDocumentChunks(text);

    documents[docId] = {
      source,
      text,
      chunks,
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

    const queryEmbedding = await embedder.embedQuery(promptQuestion);
    const ranked = doc.chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.chunk);

    const prompt = buildPrompt(promptQuestion, ranked);
    const answer = await queryModel(prompt);

    return res.json({
      answer: answer.trim(),
      chunks: ranked.map((chunk) => chunk.text),
    });
  } catch (error) {
    console.error('Query error', error?.message || error);
    return res.status(500).json({ error: 'Failed to generate an answer. Try again in a moment.' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', loadedDocuments: Object.keys(documents).length });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`RAG server running on http://localhost:${port}`);
});
