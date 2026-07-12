const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { answerQuestion, loadKnowledgeFromFile } = require('./src/rag');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function routeRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/query') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { question } = JSON.parse(body);
        if (!question || typeof question !== 'string') {
          sendJson(res, 400, { error: 'Question is required.' });
          return;
        }

        const knowledge = loadKnowledgeFromFile('data/knowledge.txt');
        const answer = answerQuestion(question, knowledge);
        sendJson(res, 200, { answer });
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid JSON payload.' });
      }
    });
    return;
  }

  if (req.method === 'GET') {
    const requestPath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const sanitizedPath = decodeURIComponent(requestPath).replace(/\/+/, '/');
    const filePath = path.join(PUBLIC_DIR, sanitizedPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
    };

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath, contentTypes[ext] || 'application/octet-stream');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
}

const server = http.createServer(routeRequest);
server.listen(PORT, () => {
  console.log(`RAG bot server running at http://localhost:${PORT}`);
});
