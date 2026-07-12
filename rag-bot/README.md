# Simple RAG Bot

A beginner-friendly Retrieval-Augmented Generation (RAG) bot prototype.

## Run locally

```bash
cd rag-bot
node server.js
```

Then open `http://localhost:3000` in your browser.

## Use the CLI

```bash
cd rag-bot
node app.js "What is the refund policy?"
```

## How it works

- `data/knowledge.txt` contains the knowledge base.
- `src/rag.js` handles retrieval and answer generation.
- `server.js` serves the web UI and exposes `/api/query`.
- `public/` contains the browser frontend.

## Notes

This project uses only built-in Node APIs, so no dependencies are required.
