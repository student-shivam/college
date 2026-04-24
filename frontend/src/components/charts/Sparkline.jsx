import { useMemo } from "react";

function buildPath(points) {
  if (!points.length) return "";
  return points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

export default function Sparkline({ values, color = "rgba(122, 53, 223, 0.95)" }) {
  const { d } = useMemo(() => {
    const arr = Array.isArray(values) ? values.map((v) => Number(v) || 0) : [];
    const width = 120;
    const height = 34;
    const pad = 2;
    const max = arr.length ? Math.max(...arr) : 0;
    const min = arr.length ? Math.min(...arr) : 0;
    const span = max - min || 1;

    const pts = arr.map((v, idx) => {
      const x = pad + (idx / Math.max(arr.length - 1, 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return { x, y };
    });

    return { d: buildPath(pts) };
  }, [values]);

  return (
    <svg width="120" height="34" viewBox="0 0 120 34" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

