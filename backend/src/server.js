const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const machineRoutes = require("./routes/machines");
const predictionRoutes = require("./routes/predictions");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");
const dataRoutes = require("./routes/data");
const modelRoutes = require("./routes/model");
const alertsRoutes = require("./routes/alerts");
const { runtime } = require("./state/runtime");
const { ensureDevAdmin } = require("./utils/seedAdmin");

// Load backend/.env reliably even if server is started from repo root.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const serverStartedAt = new Date().toISOString();

function readAllowedOrigins() {
  const raw =
    process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    "";

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = readAllowedOrigins();
const corsOrigin =
  process.env.NODE_ENV === "production" && allowedOrigins.length > 0
    ? (origin, cb) => {
        // Allow same-origin / non-browser requests (no Origin header)
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`), false);
      }
    : "*";

app.use(
  cors({
    origin: corsOrigin
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "backend",
    endpoints: ["/health", "/api/*"],
    startedAt: serverStartedAt
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "backend",
    startedAt: serverStartedAt,
    mode: runtime.memoryMode ? "memory" : "mongo",
    dbReady: runtime.dbReady
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/machines", machineRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/model", modelRoutes);
app.use("/api/alerts", alertsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const response = { message: "Internal server error" };
  if (process.env.NODE_ENV !== "production") {
    response.error = err.message;
  }
  res.status(500).json(response);
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

connectDB()
  .then(async () => {
    await ensureDevAdmin();
  })
  .catch(async (err) => {
    runtime.memoryMode = true;
    runtime.dbReady = false;
    console.warn("DB connect failed; continuing in memory mode:", err.message);
    await ensureDevAdmin();
  });
