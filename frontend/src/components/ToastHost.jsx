import { useEffect, useMemo, useState } from "react";
import { subscribeToToasts } from "../utils/toastBus";

function toneClass(type) {
  if (type === "success") return "toast-success";
  if (type === "error") return "toast-error";
  return "toast-info";
}

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  const api = useMemo(
    () => ({
      remove: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
      push: (toast) =>
        setToasts((prev) => {
          const next = [...prev, toast];
          return next.slice(-4);
        })
    }),
    []
  );

  useEffect(() => {
    return subscribeToToasts((t) => {
      api.push(t);
      const duration = Number(t.durationMs) || 4000;
      window.setTimeout(() => api.remove(t.id), duration);
    });
  }, [api]);

  if (!toasts.length) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={["toast", toneClass(t.type)].join(" ")}>
          <div className="toast-message">{t.message}</div>
          <button
            type="button"
            className="toast-close"
            onClick={() => api.remove(t.id)}
            aria-label="Close notification"
            title="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

