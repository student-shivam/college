# ML API (FastAPI)

This service runs a predictive maintenance model and serves real-time prediction endpoints.

## Run

```bash
pip install -r requirements.txt
python app/main.py
```

## Endpoints

- `GET /health`
- `GET /model/info`
- `POST /predict`
- `POST /train`
