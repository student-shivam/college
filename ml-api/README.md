# ML API (FastAPI)

This service runs a predictive maintenance model and serves real-time prediction endpoints.

## Run

```bash
python app/main.py
```

Notes:
- If `fastapi` / `uvicorn` are installed, it will run as a FastAPI app.
- If not installed (or pip is blocked), it automatically falls back to a stdlib HTTP server with the same endpoints.

## Endpoints

- `GET /health`
- `GET /model/info`
- `POST /predict`
- `POST /train`
