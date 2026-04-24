let currentAudio = null;

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

export function playPublicSound(filename, { volume = 1, interrupt = true } = {}) {
  if (typeof window === "undefined") return false;
  if (typeof Audio === "undefined") return false;
  if (!filename) return false;

  const src = joinBaseUrl(filename);

  try {
    if (interrupt && currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    currentAudio = new Audio(src);
    currentAudio.volume = Math.min(Math.max(Number(volume) || 1, 0), 1);
    // Don't throw if autoplay is blocked; just no-op.
    currentAudio.play().catch(() => {});
    return true;
  } catch (_err) {
    return false;
  }
}

export function playRiskSound(riskLevel, opts) {
  const file = soundFileForRiskLevel(riskLevel);
  return playPublicSound(file, opts);
}

