# Predictive Maintenance System (AI/ML + MERN + React)

This project is split into 3 services:

- `frontend`: React + CSS dashboard
- `backend`: Node.js + Express + MongoDB API
- `ml-api`: Python FastAPI service with ML model for failure prediction

## Architecture

1. User enters machine sensor values in React UI.
2. Frontend sends data to Node backend.
3. Backend sends features to Python ML API.
4. ML API returns failure probability, risk level, and recommendation.
5. Backend stores prediction logs in MongoDB and sends response back to UI.

## Quick Start

Open 3 terminals from project root:

### 1) ML API

```bash
cd ml-api
pip install -r requirements.txt
python app/main.py
```

### 2) Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Set values in `backend/.env`:

- `PORT=5000`
- `MONGO_URI=mongodb://127.0.0.1:27017/predictive_maintenance`
- `ML_API_URL=http://127.0.0.1:8000`
- `FRONTEND_URL=http://localhost:5173`
- `JWT_SECRET=your_long_random_secret`

### 3) Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set in `frontend/.env`:

- `VITE_API_BASE_URL=http://localhost:5000/api`

## One Command Run (Windows PowerShell)

From project root:

```powershell
.\run-all.ps1
```

This starts:
- ML API on `http://127.0.0.1:8000`
- Backend on `http://localhost:5000`
- Frontend on `http://localhost:5173`

## Admin: Model Management

- UI: `http://localhost:5173/admin/model`
- Backend APIs:
  - `GET /api/model/status`
  - `POST /api/model/train`
  - `POST /api/model/update`
- ML API:
  - `POST /train` (RandomForest training; saves `ml-api/app/models/model.joblib`)

## Example Prediction Payload

```json
{
  "machineId": "optional_mongodb_machine_id",
  "temperature": 85,
  "vibration": 6.2,
  "pressure": 42,
  "humidity": 60,
  "rpm": 2100,
  "voltage": 220,
  "current": 18,
  "runtimeHours": 3500,
  "errorCount": 3,
  "maintenanceLagDays": 40
}
```

## Authentication and Roles

- Signup/Login includes role dropdown: `admin` or `user`.
- `admin` can add machines, view system dashboard, and view all prediction logs.
- `user` gets limited access: run predictions and view only own prediction history.
