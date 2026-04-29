# Deployment guide (Render + Netlify)

This repo has 3 parts:

- `backend/` (Node/Express) → Deploy on Render (Web Service)
- `frontend/` (Vite/React) → Deploy on Netlify (Static site)
- `ml-api/` (FastAPI) → Deploy on Render (Web Service)

## 1) Deploy `ml-api` on Render

Create a **Web Service** on Render:

- **Root Directory**: `ml-api`
- **Environment**: Python
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Env vars (Render → Environment):

- `MONGO_URI` = your MongoDB connection string (optional but recommended)

After deploy, copy the public URL:

- `ML_API_PUBLIC_URL` = `https://<your-ml-service>.onrender.com`

## 2) Deploy `backend` on Render

Create a **Web Service** on Render:

- **Root Directory**: `backend`
- **Environment**: Node
- **Build Command**: `npm ci`
- **Start Command**: `npm start`

Env vars (Render → Environment):

- `NODE_ENV` = `production`
- `JWT_SECRET` = long random secret
- `MONGO_URI` = your MongoDB connection string (recommended)
- `ML_API_URL` = `ML_API_PUBLIC_URL` from step 1 (example: `https://<your-ml-service>.onrender.com`)
- `FRONTEND_URL` = Netlify site URL from step 3 (example: `https://<your-site>.netlify.app`)

Notes:

- Render automatically sets `PORT` for you; don’t hardcode it.
- `MONGO_URI_FALLBACK` is optional (mostly useful for local dev).
- For production, keep `SEED_ADMIN` **unset** or set it to `false`.

After deploy, copy the public URL:

- `BACKEND_PUBLIC_URL` = `https://<your-backend>.onrender.com`

## 3) Deploy `frontend` on Netlify

Create a new site on Netlify:

- **Base directory**: `frontend`
- **Build command**: `npm ci && npm run build`
- **Publish directory**: `frontend/dist`

Environment variables (Netlify → Site configuration → Environment variables):

- `VITE_API_BASE_URL` = `BACKEND_PUBLIC_URL/api` (example: `https://<your-backend>.onrender.com/api`)

After deploy, copy the Netlify URL and set it back in Render (backend env):

- `FRONTEND_URL` = `https://<your-site>.netlify.app`

## 4) Quick verification

- Backend health: `GET https://<your-backend>.onrender.com/health`
- ML health: `GET https://<your-ml-service>.onrender.com/health`

If predictions fail because ML is down, backend auto-fallbacks to a local predictor.

