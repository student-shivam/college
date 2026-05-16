# Predictive Maintenance System

A full-stack, AI-powered predictive maintenance platform designed to monitor industrial machinery, predict failures using machine learning, and provide actionable insights through a modern, fully animated dashboard. 

## 🏗️ System Architecture

This project is divided into three distinct services that work together seamlessly:

1. **Frontend**: React-based UI for User and Admin portals.
2. **Backend**: Express/Node.js API serving data, authentication, and orchestrating requests.
3. **ML-API**: Python/FastAPI microservice handling machine learning predictions and model training.

---

## 1️⃣ Frontend (`/frontend`)
The frontend is built using **React** (via Vite) and provides a highly interactive, animated, and responsive user experience. It uses **Framer Motion** for all page transitions, stagger animations, and background effects to give a premium "SaaS" feel.

### Key Technologies
- **React.js**: Component-based UI rendering.
- **Framer Motion**: Handles all complex animations, spring physics, layout transitions, and background effects (like GearBackground, TechBackground).
- **Axios**: Manages API calls to the Backend with JWT token interceptors.
- **Vanilla CSS**: Styled manually using custom variables for a sleek dark mode.

### How it Works (File by File)
- **`src/api.js`**: Configures Axios. Resolves the correct backend `baseURL` depending on the environment (localhost vs production) and attaches the `Authorization: Bearer <token>` to every request automatically. It intercepts errors to detect if the backend is offline.
- **`src/services/backend.js`**: A wrapper that contains all functions calling the backend. 
  - *Example functions:* `uploadMyAvatar(file)`, `createPrediction(payload)`, `getUserDashboardOverview()`. It handles FormData boundaries automatically.
- **`src/auth/AuthProvider.jsx`**: A React Context provider that manages the user's session. It loads the user profile on startup, stores the token in `localStorage`, and handles login/logout state globally.
- **`src/pages/user/Dashboard.jsx`**: The main user view. Uses staggered Framer Motion to load KPI cards and charts. It communicates with the backend stream via `openUserDashboardStream` for real-time updates.
- **`src/components/TechBackground.jsx` & `GearBackground.jsx`**: These are animated background components. They use `framer-motion` to render glowing lines, data streams, and rotating gears asynchronously without affecting the main UI performance.

---

## 2️⃣ Backend (`/backend`)
The backend is a robust **Node.js + Express** server. It acts as the central hub: interacting with MongoDB for data persistence, serving uploaded files (like avatars and CSVs), and proxying machine learning requests to the ML-API.

### Key Technologies
- **Node.js & Express**: API routing and request handling.
- **MongoDB & Mongoose**: Database and schema definition for Users, Machines, Predictions, Data, and Alerts.
- **Multer**: Handles multipart/form-data for file uploads (Avatars and CSV data).
- **BcryptJS & JSONWebToken (JWT)**: Secure password hashing and stateless session management.

### How it Works (File by File)
- **`src/server.js`**: The main entry point. Initializes Express, configures CORS, sets up static file serving for `/uploads`, and registers all routers (`/api/auth`, `/api/machines`, etc.). It also attempts to connect to MongoDB and falls back to a "Memory Mode" if the database is down.
- **`src/routes/auth.js`**: Exposes `/login` and `/signup`. Handles comparing passwords with `bcrypt` and issuing JWTs.
- **`src/routes/users.js`**: Manages user profiles. 
  - *Key function:* `router.post("/me/avatar", ...)` uses `multer.diskStorage` to save uploaded images to the `/uploads/avatars/` directory and updates the user's `avatarUrl`.
- **`src/routes/predictions.js`**: When the frontend asks for a prediction, this route receives the sensor data. It then makes an internal HTTP call to the Python ML-API (`/predict`). Once the ML-API returns a failure probability, the backend saves the result to MongoDB and returns it to the frontend.
- **`src/state/runtime.js`**: An in-memory fallback state. If MongoDB is unavailable, the backend seamlessly switches to storing data in memory so the app doesn't crash during demonstrations.

---

## 3️⃣ Machine Learning API (`/ml-api`)
The ML-API is a **Python/FastAPI** microservice dedicated to data science operations. It uses Scikit-Learn to train a RandomForest model on sensor data and make real-time predictions.

### Key Technologies
- **Python & FastAPI**: Lightweight API framework for serving the model.
- **Scikit-Learn**: For the predictive maintenance model (typically a classifier predicting "Failure" vs "Normal").
- **Joblib**: Used to serialize (save) and deserialize (load) the trained model `.pkl` file.

### How it Works (File by File)
- **`app/main.py`**: The FastAPI application entry point. It exposes `/predict` and `/train` endpoints.
- **`POST /predict`**: Receives sensor readings from the Node.js backend and returns a failure probability + risk level.
- **`POST /train`**: Trains/updates the model and returns training metadata (best-effort).

---

## Deployment (Render + Netlify)

### Render (Backend + ML API)
This repo includes a Render Blueprint at `render.yaml` (repo root) that deploys both services from this monorepo.

1. Push this repo to GitHub.
2. On Render, use **New + → Blueprint** and select the repo.
3. Set these environment variables in Render:

**ML API service (`predictive-maintenance-ml-api`)**
- `MONGO_URI` (optional; only needed if you want ML training metadata stored in Mongo)

**Backend service (`predictive-maintenance-backend`)**
- `MONGO_URI` (required)
- `ML_API_URL` = `https://predictive-maintenance-ml-api.onrender.com`
- `FRONTEND_URLS` = `https://<your-site>.netlify.app` (optional; comma-separated list if multiple)

### Netlify (Frontend)
The frontend is configured via `frontend/netlify.toml`:
- SPA refresh routing works (all paths serve `index.html`)
- `/api/*` is proxied to Render backend by default

If you rename the Render backend service, update this line:
- `frontend/netlify.toml` → `to = \"https://predictive-maintenance-backend.onrender.com/api/:splat\"`

---

## 🔄 The Full Request Lifecycle (Example: Running a Prediction)

1. **User Action:** The user fills out sensor inputs on the `Predictions.jsx` frontend page and clicks "Predict".
2. **Frontend Call:** `backend.createPrediction(payload)` is called in `frontend/src/services/backend.js`. Axios attaches the JWT token and sends a POST request to the backend.
3. **Backend Routing:** The Node.js server receives the request at `/api/predictions`. The `authenticate` middleware verifies the JWT token.
4. **Proxy to ML-API:** Node.js forwards the raw sensor data via an HTTP POST request to the Python ML-API (e.g., `http://localhost:8000/predict`).
5. **Machine Learning:** The Flask app receives the data, feeds it through the `scikit-learn` model, calculates a `65%` failure probability, and flags it as `High Risk`. It sends this back to Node.js.
6. **Database Save:** Node.js saves the prediction record into MongoDB associated with the user and the specific machine.
7. **Frontend Update:** Node.js returns the final prediction object to React. The UI triggers a Framer Motion staggered animation to display the results, and the `playRiskSound()` function triggers an audio alert based on the risk severity.
