import json
import os
import random
import sys
from datetime import datetime, timezone
from math import exp
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

HAVE_FASTAPI = False
FastAPI = None
HTTPException = None
BaseModel = None
Field = None

try:
    from fastapi import FastAPI as _FastAPI, HTTPException as _HTTPException
    from pydantic import BaseModel as _BaseModel, Field as _Field

    FastAPI = _FastAPI
    HTTPException = _HTTPException
    BaseModel = _BaseModel
    Field = _Field
    HAVE_FASTAPI = True
except Exception:
    HAVE_FASTAPI = False

try:
    from joblib import dump as joblib_dump
    from joblib import load as joblib_load
except Exception:  # pragma: no cover
    joblib_dump = None
    joblib_load = None

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover
    MongoClient = None

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import accuracy_score, log_loss
except Exception:  # pragma: no cover
    RandomForestClassifier = None
    accuracy_score = None
    log_loss = None


FEATURES = [
    "temperature",
    "vibration",
    "pressure",
    "humidity",
    "rpm",
    "voltage",
    "current",
    "runtime_hours",
    "error_count",
    "maintenance_lag_days",
]

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODELS_DIR / "model.joblib"
META_PATH = MODELS_DIR / "meta.json"


def can_write_models_dir() -> bool:
    try:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        test = MODELS_DIR / ".write_test"
        test.write_text("ok", encoding="utf-8")
        test.unlink(missing_ok=True)
        return True
    except Exception:
        return False


def utc_iso(dt: Optional[datetime] = None) -> str:
    if dt is None:
        dt = datetime.now(timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def sigmoid(x: float) -> float:
    if x >= 0:
        z = exp(-x)
        return 1.0 / (1.0 + z)
    z = exp(x)
    return z / (1.0 + z)


def risk_level(probability: float) -> str:
    if probability < 0.25:
        return "Low"
    if probability < 0.5:
        return "Medium"
    if probability < 0.75:
        return "High"
    return "Critical"


def recommendation(level: str) -> str:
    mapping = {
        "Low": "Continue normal operation and monitor weekly.",
        "Medium": "Schedule preventive inspection within 7 days.",
        "High": "Plan maintenance within 48 hours and reduce machine load.",
        "Critical": "Immediate shutdown and maintenance recommended.",
    }
    return mapping.get(level, "Monitor and schedule inspection.")


def fallback_probability(values: Dict[str, float]) -> float:
    score = (
        0.05 * (values["temperature"] - 70)
        + 0.85 * (values["vibration"] - 4)
        + 0.03 * (values["pressure"] - 35)
        + 0.001 * (values["humidity"] - 50)
        + 0.0014 * (values["rpm"] - 1800)
        - 0.02 * (values["voltage"] - 230)
        + 0.07 * (values["current"] - 14)
        + 0.00035 * (values["runtime_hours"] - 3000)
        + 0.42 * values["error_count"]
        + 0.013 * values["maintenance_lag_days"]
        - 0.8
    )
    return sigmoid(score)


def extract_db_name(uri: str) -> str:
    # mongodb://host:port/dbname?...
    try:
        after = uri.split("://", 1)[1]
        path = after.split("/", 1)[1] if "/" in after else ""
        db = path.split("?", 1)[0].strip()
        return db or "predictive_maintenance"
    except Exception:
        return "predictive_maintenance"


def connect_mongo() -> Optional[Tuple[Any, str]]:
    if MongoClient is None:
        return None

    primary = os.getenv("MONGO_URI", "")
    fallback = os.getenv("MONGO_URI_FALLBACK", "mongodb://127.0.0.1:27017/predictive_maintenance")

    candidates = [primary, fallback] if primary else [fallback]
    for uri in candidates:
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=2500)
            client.admin.command("ping")
            return client, extract_db_name(uri)
        except Exception:
            continue
    return None


def coerce_float(value: Any, default: float) -> float:
    try:
        n = float(value)
        if n != n:  # NaN
            return default
        return n
    except Exception:
        return default


def normalize_row(row: Dict[str, Any]) -> Dict[str, float]:
    # Fill missing values with sensible defaults (model will still work).
    defaults = {
        "temperature": 70.0,
        "vibration": 4.0,
        "pressure": 35.0,
        "humidity": 50.0,
        "rpm": 1800.0,
        "voltage": 230.0,
        "current": 14.0,
        "runtime_hours": 3000.0,
        "error_count": 0.0,
        "maintenance_lag_days": 30.0,
    }
    values: Dict[str, float] = {}
    for field in FEATURES:
        values[field] = coerce_float(row.get(field), defaults[field])
    return values


def label_from_row(row: Dict[str, Any], values: Dict[str, float]) -> int:
    # If prediction logs exist, learn from their probabilities; otherwise use heuristic.
    prob = row.get("failureProbability")
    if prob is not None:
        p = coerce_float(prob, 0.0)
        return 1 if p >= 0.5 else 0

    # Heuristic pseudo-label for demo training (no ground truth in seed dataset).
    if values["vibration"] >= 6.0:
        return 1
    if values["temperature"] >= 95.0:
        return 1
    if values["pressure"] >= 80.0:
        return 1
    if values["error_count"] >= 2.0:
        return 1
    return 0


def load_training_data(limit: int = 5000) -> Tuple[List[List[float]], List[int], str]:
    connected = connect_mongo()
    if connected is None:
        return synthetic_training_data(max(400, min(limit, 3000)))

    client, dbname = connected
    try:
        db = client[dbname]
        rows: List[Dict[str, Any]] = []

        # 1) Prefer prediction logs (richer feature set).
        try:
            cursor = db["predictionlogs"].find({}, {"sensorData": 1, "failureProbability": 1}).limit(
                limit
            )
            for doc in cursor:
                sensor = doc.get("sensorData") or {}
                flat: Dict[str, Any] = dict(sensor)
                if "failureProbability" in doc:
                    flat["failureProbability"] = doc.get("failureProbability")
                rows.append(flat)
        except Exception:
            rows = []

        # 2) If not enough, add sensor data uploads (temperature/vibration/pressure).
        if len(rows) < 200:
            try:
                cursor = db["sensordatas"].find(
                    {}, {"temperature": 1, "vibration": 1, "pressure": 1}
                ).limit(limit)
                for doc in cursor:
                    rows.append(doc)
            except Exception:
                pass

        if not rows:
            return synthetic_training_data(max(400, min(limit, 3000)))

        X: List[List[float]] = []
        y: List[int] = []
        for r in rows:
            values = normalize_row(r)
            X.append([values[f] for f in FEATURES])
            y.append(label_from_row(r, values))

        return X, y, f"mongo:{dbname}"
    finally:
        try:
            client.close()
        except Exception:
            pass


def synthetic_training_data(n: int = 800) -> Tuple[List[List[float]], List[int], str]:
    X: List[List[float]] = []
    y: List[int] = []
    rng = random.Random(42)
    for _ in range(n):
        values = {
            "temperature": rng.uniform(40, 130),
            "vibration": rng.uniform(0, 12),
            "pressure": rng.uniform(10, 120),
            "humidity": rng.uniform(10, 95),
            "rpm": rng.uniform(500, 6000),
            "voltage": rng.uniform(180, 280),
            "current": rng.uniform(2, 40),
            "runtime_hours": rng.uniform(0, 20000),
            "error_count": rng.uniform(0, 6),
            "maintenance_lag_days": rng.uniform(0, 365),
        }
        label = label_from_row({}, values)
        X.append([values[f] for f in FEATURES])
        y.append(label)
    return X, y, "synthetic"


def split_train_test(X: List[List[float]], y: List[int], test_ratio: float = 0.2):
    idx = list(range(len(X)))
    rng = random.Random(123)
    rng.shuffle(idx)
    cut = max(int(len(idx) * (1.0 - test_ratio)), 1)
    train_idx = idx[:cut]
    test_idx = idx[cut:] or idx[:1]
    X_train = [X[i] for i in train_idx]
    y_train = [y[i] for i in train_idx]
    X_test = [X[i] for i in test_idx]
    y_test = [y[i] for i in test_idx]
    return X_train, X_test, y_train, y_test


if HAVE_FASTAPI:

    class PredictRequest(BaseModel):
        temperature: float = Field(..., ge=-50, le=300)
        vibration: float = Field(..., ge=0, le=50)
        pressure: float = Field(..., ge=0, le=300)
        humidity: float = Field(..., ge=0, le=100)
        rpm: float = Field(..., ge=0, le=10000)
        voltage: float = Field(..., ge=0, le=1000)
        current: float = Field(..., ge=0, le=1000)
        runtime_hours: float = Field(..., ge=0, le=100000)
        error_count: float = Field(..., ge=0, le=1000)
        maintenance_lag_days: float = Field(..., ge=0, le=3650)

    class TrainRequest(BaseModel):
        mode: str = Field("train", pattern="^(train|update)$")
        limit: int = Field(5000, ge=200, le=50000)


class ModelState:
    def __init__(self):
        self.model = None
        self.fs_write_ok = can_write_models_dir()
        self.meta: Dict[str, Any] = {
            "model_version": "local-fallback-v1",
            "trained_at": utc_iso(),
            "features": FEATURES,
            "source": "fallback",
            "accuracy": None,
            "loss": None,
            "samples": None,
        }

    def load(self) -> None:
        if not self.fs_write_ok:
            return
        if META_PATH.exists():
            try:
                self.meta = json.loads(META_PATH.read_text(encoding="utf-8"))
            except Exception:
                pass

        if MODEL_PATH.exists() and joblib_load is not None:
            try:
                self.model = joblib_load(str(MODEL_PATH))
            except Exception:
                self.model = None

    def save(self) -> None:
        if not self.fs_write_ok:
            return
        try:
            MODELS_DIR.mkdir(parents=True, exist_ok=True)
            META_PATH.write_text(json.dumps(self.meta, indent=2), encoding="utf-8")
        except Exception:
            return

    def predict_probability(self, values: Dict[str, float]) -> float:
        if self.model is None:
            return fallback_probability(values)

        try:
            proba = self.model.predict_proba([[values[f] for f in FEATURES]])[0][1]
            return float(proba)
        except Exception:
            return fallback_probability(values)


state = ModelState()
state.load()


def predict_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    values = normalize_row(payload)
    probability = state.predict_probability(values)
    level = risk_level(probability)
    return {
        "failure_probability": round(probability, 4),
        "risk_level": level,
        "recommendation": recommendation(level),
        "model_version": state.meta.get("model_version", "local-fallback-v1"),
    }


def train_payload(payload: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    mode = str(payload.get("mode") or "train").strip().lower()
    if mode not in ("train", "update"):
        mode = "train"
    limit = payload.get("limit", 5000)
    try:
        limit_n = int(limit)
    except Exception:
        limit_n = 5000
    limit_n = max(200, min(limit_n, 50000))

    trained_at = utc_iso()

    # In restricted environments (no deps / no FS write), return a best-effort response
    # so the backend can mark the training job as Completed.
    if RandomForestClassifier is None or accuracy_score is None or log_loss is None:
        model_version = f"fallback-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        state.model = None
        state.meta = {
            "model_version": model_version,
            "trained_at": trained_at,
            "features": FEATURES,
            "source": "fallback",
            "accuracy": None,
            "loss": None,
            "samples": None,
            "mode": mode,
        }
        state.save()
        return 200, {
            "model_version": model_version,
            "trained_at": trained_at,
            "accuracy": None,
            "loss": None,
            "samples": None,
            "source": "fallback",
        }

    if joblib_dump is None or not state.fs_write_ok:
        # Can train in-memory only (no persistence).
        X, y, source = load_training_data(limit=limit_n)
        if len(X) < 50:
            return 400, {"message": "Not enough training data."}

        X_train, X_test, y_train, y_test = split_train_test(X, y)
        model = RandomForestClassifier(n_estimators=160, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        accuracy = float(accuracy_score(y_test, y_pred))
        y_proba = model.predict_proba(X_test)
        loss = float(log_loss(y_test, y_proba))

        model_version = f"rf-mem-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        state.model = model
        state.meta = {
            "model_version": model_version,
            "trained_at": trained_at,
            "features": FEATURES,
            "source": source,
            "accuracy": round(accuracy, 6),
            "loss": round(loss, 6),
            "samples": len(X),
            "mode": mode,
        }
        state.save()
        return 200, {
            "model_version": model_version,
            "trained_at": trained_at,
            "accuracy": round(accuracy, 6),
            "loss": round(loss, 6),
            "samples": len(X),
            "source": source,
        }

    X, y, source = load_training_data(limit=limit_n)
    if len(X) < 50:
        return 400, {"message": "Not enough training data."}

    X_train, X_test, y_train, y_test = split_train_test(X, y)
    model = RandomForestClassifier(n_estimators=160, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    y_proba = model.predict_proba(X_test)
    loss = float(log_loss(y_test, y_proba))

    model_version = f"rf-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    try:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib_dump(model, str(MODEL_PATH))
    except Exception:
        # fallback to memory-only
        model_version = f"rf-mem-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    state.model = model
    state.meta = {
        "model_version": model_version,
        "trained_at": trained_at,
        "features": FEATURES,
        "source": source,
        "accuracy": round(accuracy, 6),
        "loss": round(loss, 6),
        "samples": len(X),
        "mode": mode,
    }
    state.save()

    return 200, {
        "model_version": model_version,
        "trained_at": trained_at,
        "accuracy": round(accuracy, 6),
        "loss": round(loss, 6),
        "samples": len(X),
        "source": source,
    }


if HAVE_FASTAPI:
    app = FastAPI(title="Predictive Maintenance ML API")


    @app.get("/health")
    def health():
        return {"status": "ok", "service": "ml-api", "model_version": state.meta.get("model_version")}


    @app.get("/model/info")
    def model_info():
        return {
            "model_version": state.meta.get("model_version"),
            "trained_at": state.meta.get("trained_at"),
            "features": state.meta.get("features", FEATURES),
            "stats": {
                "source": state.meta.get("source"),
                "samples": state.meta.get("samples"),
                "accuracy": state.meta.get("accuracy"),
                "loss": state.meta.get("loss"),
            },
        }


    @app.post("/predict")
    def predict(req: "PredictRequest"):
        values = req.model_dump()
        return predict_payload(values)


    @app.post("/train")
    def train(req: "TrainRequest"):
        status, body = train_payload(req.model_dump())
        if status >= 400:
            raise HTTPException(status_code=status, detail=body.get("message") or "Training failed")
        return body


def run():
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))

    if HAVE_FASTAPI:
        try:
            import uvicorn  

            uvicorn.run("app.main:app", host=host, port=port, reload=False)
            return
        except Exception:
            pass

    
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    from urllib.parse import urlparse

    started_at = utc_iso()

    def send_json(handler: BaseHTTPRequestHandler, status: int, payload: Dict[str, Any]):
        body = json.dumps(payload).encode("utf-8")
        handler.send_response(status)
        handler.send_header("Content-Type", "application/json; charset=utf-8")
        handler.send_header("Content-Length", str(len(body)))
        handler.send_header("Access-Control-Allow-Origin", "*")
        handler.send_header("Access-Control-Allow-Headers", "Content-Type")
        handler.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        handler.end_headers()
        handler.wfile.write(body)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, _format: str, *_args: Any) -> None:
            return

        def do_OPTIONS(self):  # noqa: N802
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.end_headers()

        def do_GET(self):  # noqa: N802
            path = urlparse(self.path).path
            if path == "/health":
                return send_json(
                    self,
                    200,
                    {
                        "status": "ok",
                        "service": "ml-api",
                        "model_version": state.meta.get("model_version"),
                        "started_at": started_at,
                        "mode": "stdlib",
                    },
                )
            if path == "/model/info":
                return send_json(
                    self,
                    200,
                    {
                        "model_version": state.meta.get("model_version"),
                        "trained_at": state.meta.get("trained_at"),
                        "features": state.meta.get("features", FEATURES),
                        "stats": {
                            "source": state.meta.get("source"),
                            "samples": state.meta.get("samples"),
                            "accuracy": state.meta.get("accuracy"),
                            "loss": state.meta.get("loss"),
                        },
                    },
                )
            return send_json(self, 404, {"message": "Not Found"})

        def do_POST(self):  # noqa: N802
            path = urlparse(self.path).path
            try:
                length = int(self.headers.get("Content-Length") or "0")
            except Exception:
                length = 0
            raw = self.rfile.read(length) if length > 0 else b""
            try:
                payload = json.loads(raw.decode("utf-8") or "{}")
                if not isinstance(payload, dict):
                    payload = {}
            except Exception:
                payload = {}

            if path == "/predict":
                return send_json(self, 200, predict_payload(payload))

            if path == "/train":
                status, body = train_payload(payload)
                return send_json(self, status, body)

            return send_json(self, 404, {"message": "Not Found"})

    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"ML API running (stdlib) on http://{host}:{port}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        try:
            httpd.server_close()
        except Exception:
            pass


if __name__ == "__main__":
    run()
