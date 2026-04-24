import { useMemo } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildPath(points) {
  if (!points.length) return "";
  return points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

export default function LineChart({
  data,
  series,
  height = 220,
  padding = 16,
  showDots = false
}) {
  const { paths, yMax, xLabels } = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    const safeSeries = Array.isArray(series) ? series : [];

    const values = [];
    safeData.forEach((row) => {
      safeSeries.forEach((s) => {
        const v = Number(row?.[s.key]);
        if (Number.isFinite(v)) values.push(v);
      });
    });

    const max = values.length ? Math.max(...values) : 0;
    const yMaxLocal = max <= 0 ? 1 : max;

    const width = 1000;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;
    const n = safeData.length;

    function xScale(i) {
      if (n <= 1) return padding + plotW / 2;
      return padding + (i / (n - 1)) * plotW;
    }

    function yScale(v) {
      const p = clamp(v / yMaxLocal, 0, 1);
      return padding + (1 - p) * plotH;
    }

    const outPaths = safeSeries.map((s) => {
      const pts = safeData.map((row, idx) => {
        const v = Number(row?.[s.key]) || 0;
        return { x: xScale(idx), y: yScale(v), v };
      });
      return { key: s.key, color: s.color, points: pts, d: buildPath(pts) };
    });

    const labels = safeData.map((row) => String(row?.date || ""));
    return { paths: outPaths, yMax: yMaxLocal, xLabels: labels };
  }, [data, series, height, padding]);

  return (
    <svg
      viewBox={`0 0 1000 ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Line chart"
    >
      <defs>
        <linearGradient id="gridFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((p) => (
        <line
          key={p}
          x1="16"
          x2="984"
          y1={(height - 16) - p * (height - 32)}
          y2={(height - 16) - p * (height - 32)}
          stroke="url(#gridFade)"
          strokeWidth="1"
        />
      ))}

      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {showDots &&
        paths.flatMap((p) =>
          p.points.map((pt, idx) => (
            <circle key={`${p.key}-${idx}`} cx={pt.x} cy={pt.y} r="4" fill={p.color} />
          ))
        )}

      <text x="16" y="20" fill="rgba(235,241,255,0.62)" fontSize="12" fontWeight="700">
        0
      </text>
      <text
        x="16"
        y="44"
        fill="rgba(235,241,255,0.62)"
        fontSize="12"
        fontWeight="700"
      >
        {yMax}
      </text>

      {xLabels.length > 1 && (
        <>
          <text
            x="16"
            y={height - 6}
            fill="rgba(235,241,255,0.55)"
            fontSize="11"
            fontWeight="700"
          >
            {xLabels[0]}
          </text>
          <text
            x="984"
            y={height - 6}
            textAnchor="end"
            fill="rgba(235,241,255,0.55)"
            fontSize="11"
            fontWeight="700"
          >
            {xLabels[xLabels.length - 1]}
          </text>
        </>
      )}
    </svg>
  );
}

