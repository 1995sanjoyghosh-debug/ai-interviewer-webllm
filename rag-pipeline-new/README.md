# rag-pipeline-new

FastAPI + React RAG application with token and cost monitoring.

## Local setup

1. Create a Python environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install backend packages:
   ```powershell
   pip install -r requirements.txt
   ```

3. Install frontend packages:
   ```powershell
   cd client
   npm install
   ```

4. Copy `.env.example` to `.env` and set your Hugging Face API key.

## Run locally

Start backend:
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start frontend:
```powershell
cd client
npm run dev
```

Open `http://localhost:5173`.

## API endpoints

- `POST /api/ingest`
  - file: upload PDF/DOCX/TXT
  - text: paste document text
  - url: ingest page text from a URL

- `POST /api/query`
  - doc_id
  - question

- `POST /api/clear-chat`
  - doc_id

- `GET /api/health`

## Monitoring

Responses return `usage` with:
- `embedding_tokens`
- `completion_tokens`
- `estimated_embedding_cost`
- `estimated_completion_cost`
- `estimated_total_cost`

Adjust pricing in `.env` via:
- `COST_PER_1000_COMPLETION_TOKENS`
- `COST_PER_1000_EMBEDDING_TOKENS`

## Load testing

Use the load test script:
```powershell
python scripts/load_test.py --url http://127.0.0.1:8000/api/query --doc-id <doc_id> --requests 100 --concurrency 5
```

## CI/CD

A GitHub Actions workflow is included at:
- `.github/workflows/python-app.yml`

## Docker

A `Dockerfile` is included for containerized deployment.
