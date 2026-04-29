# ML API (FastAPI)

This service runs a predictive maintenance model and serves real-time prediction endpoints.

## Run

```bash
python app/main.py
```

Notes:
- If `fastapi` / `uvicorn` are installed, it will run as a FastAPI app.
- If not installed (or pip is blocked), it automatically falls back to a stdlib HTTP server with the same endpoints.

## Deploy (common)

- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- A `Procfile` and `Dockerfile` are included for PaaS/container deployments.
- Optional env vars:
  - `MONGO_URI` (recommended in prod) or it will try `MONGO_URI_FALLBACK` / local Mongo.
  - `PORT` (set by most platforms) and optional `HOST`.

## Endpoints

- `GET /health`
- `GET /model/info`
- `POST /predict`
- `POST /train`
