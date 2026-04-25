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

Default dev admin is auto-seeded on backend start (unless disabled):

- Email: `admin@pm.local`
- Password: `admin123`

You can change/disable via `backend/.env`:

- `SEED_ADMIN=true|false`
- `SEED_ADMIN_EMAIL=...`
- `SEED_ADMIN_PASSWORD=...`
- `SEED_ADMIN_NAME=...`

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

## Run Separately (Recommended)

Start each service in its own terminal:

### ML API

```powershell
cd ml-api
python app/main.py
```

### Backend

```powershell
cd backend
npm run dev
```

### Frontend

```powershell
cd frontend
npm run clean
npm run dev
```

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

## Live Dashboard (Admin + User)

The dashboards now use aggregated overview APIs plus an SSE stream for live updates:

- Admin:
  - `GET /api/dashboard/admin/overview?days=7`
  - `GET /api/dashboard/admin/stream?days=7` (Server-Sent Events)
- User:
  - `GET /api/dashboard/me/overview?days=7`
  - `GET /api/dashboard/me/stream?days=7` (Server-Sent Events)

Note: SSE uses `token` query param because browsers `EventSource` cannot set `Authorization` headers.
