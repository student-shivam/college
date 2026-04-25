const listeners = new Set();
const lastShownAt = new Map();

function now() {
  return Date.now();
}

function makeId() {
  return `${now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldSuppress({ type, message, dedupeKey, suppressMs }) {
  const key = dedupeKey || `${type}:${message}`;
  const windowMs = Number(suppressMs) > 0 ? Number(suppressMs) : 4000;
  const last = lastShownAt.get(key) || 0;
  const t = now();
  if (t - last < windowMs) return true;
  lastShownAt.set(key, t);
  return false;
}

export function subscribeToToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitToast(payload) {
  const toast = {
    id: payload?.id || makeId(),
    type: payload?.type || "info",
    message: String(payload?.message || ""),
    durationMs: Number(payload?.durationMs) || 4000
  };

  if (!toast.message) return toast.id;
  if (
    shouldSuppress({
      type: toast.type,
      message: toast.message,
      dedupeKey: payload?.dedupeKey,
      suppressMs: payload?.suppressMs
    })
  ) {
    return toast.id;
  }

  for (const l of listeners) l(toast);
  return toast.id;
}

export const toast = {
  info: (message, opts) =>
    emitToast({ type: "info", message, durationMs: 3500, ...(opts || {}) }),
  success: (message, opts) =>
    emitToast({ type: "success", message, durationMs: 3000, ...(opts || {}) }),
  error: (message, opts) =>
    emitToast({ type: "error", message, durationMs: 5000, ...(opts || {}) })
};

