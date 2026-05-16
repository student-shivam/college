let currentAudio = typeof window !== "undefined" && typeof Audio !== "undefined" ? new Audio() : null;

function joinBaseUrl(pathname) {
  const base = String(import.meta.env.BASE_URL || "/");
  const safeBase = base.endsWith("/") ? base : `${base}/`;
  const safePath = String(pathname || "").replace(/^\/+/, "");
  return `${safeBase}${safePath}`;
}

function normalizeRiskLevel(riskLevel) {
  return String(riskLevel || "").trim().toLowerCase();
}

export function soundFileForRiskLevel(riskLevel) {
  const r = normalizeRiskLevel(riskLevel);
  if (!r) return null;

  if (r === "low" || r === "healthy" || r === "safe" || r === "good") return "safe.mp3";
  if (r === "medium" || r === "warning" || r === "warn") return "warning.mp3";
  if (r === "high" || r === "critical" || r === "alert" || r === "danger") return "alert.mp3";

  return null;
}

export function unlockAudio() {
  if (!currentAudio) return;
  // Play a tiny silent sound synchronously to unlock the audio element for future async plays
  currentAudio.volume = 0;
  currentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
  currentAudio.play().catch(() => {});
}

export function playPublicSound(filename, { volume = 1, interrupt = true } = {}) {
  if (typeof window === "undefined") return false;
  if (!currentAudio) return false;
  if (!filename) return false;

  const src = joinBaseUrl(filename);

  try {
    if (interrupt) {
      currentAudio.pause();
    }

    currentAudio.src = src;
    currentAudio.currentTime = 0;
    currentAudio.volume = Math.min(Math.max(Number(volume) || 1, 0), 1);
    // Don't throw if autoplay is blocked; just no-op.
    const playPromise = currentAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
    return true;
  } catch (_err) {
    return false;
  }
}

export function playRiskSound(riskLevel, opts) {
  const file = soundFileForRiskLevel(riskLevel);
  return playPublicSound(file, opts);
}

