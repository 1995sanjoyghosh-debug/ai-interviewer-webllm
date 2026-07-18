# FastAPI US Time API

Async FastAPI service that returns the current US time.

## Setup

```powershell
cd fastapi-us-time
.\setup.ps1
```

The setup script installs a portable Python runtime into `.python` and then installs the dependencies from `requirements.txt`.

If you already have Python installed globally, you can use the classic virtual environment flow instead:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run locally

Easiest start command:

```powershell
.\start.ps1
```

Single worker for development:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Or on Windows:

```powershell
.\run-dev.ps1
```

Multiple workers for traffic testing:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Or on Windows:

```powershell
.\run-workers.ps1
```

## Endpoint

```http
GET /time/us?tz=eastern
```

Supported `tz` values:

- `eastern`
- `central`
- `mountain`
- `pacific`
- `alaska`
- `hawaii`

Example:

```json
{
  "timezone": "America/New_York",
  "datetime": "2026-07-12T12:30:00.000000-04:00",
  "date": "2026-07-12",
  "time": "12:30:00",
  "utc_offset": "-04:00",
  "unix_timestamp": 1783873800.0
}
```

## Worker And Traffic Analysis

This endpoint is CPU-light and does not call a database, filesystem, or external API. Because of that, one async worker can already handle many concurrent requests. Workers mainly help use multiple CPU cores and protect the service if one worker is busy or restarting.

Start with:

```text
workers = CPU cores
```

For example, on a 4-core machine:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

If traffic increases by 50x, do not immediately multiply workers by 50. Measure these three things first:

- `requests_per_second`
- `latency_p95_ms`
- CPU usage per worker

Run the included load test:

```powershell
python scripts/load_test.py --requests 5000 --concurrency 50
python scripts/load_test.py --requests 5000 --concurrency 250
python scripts/load_test.py --requests 10000 --concurrency 500
```

Optimum path:

1. Keep the endpoint async and non-blocking.
2. Run one worker per CPU core.
3. Increase workers only until p95 latency stops improving.
4. If CPU reaches 70-80% and p95 latency keeps rising, scale horizontally by running another instance behind a load balancer.
5. Add caching only if the API allows second-level freshness, for example returning the same time value for 1 second.

For this endpoint, the best scaling path is usually:

```text
async endpoint -> workers per CPU core -> load balancer with more app instances -> optional 1-second cache
```

Adding more workers than CPU cores can make performance worse because processes compete for the same CPU.
