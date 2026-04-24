import { useMemo } from "react";

function formatNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0";
  return String(num);
}

export default function DonutChart({
  segments,
  size = 220,
  stroke = 22,
  centerLabel,
  centerValue
}) {
  const { total, rings } = useMemo(() => {
    const list = Array.isArray(segments) ? segments : [];
    const sum = list.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
    const safeTotal = sum > 0 ? sum : 1;

    let offset = 0;
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;

    const out = list.map((s) => {
      const raw = Number(s.value) || 0;
      const frac = raw / safeTotal;
      const dash = frac * circ;
      const ring = {
        label: s.label,
        value: raw,
        color: s.color,
        dasharray: `${dash} ${circ - dash}`,
        dashoffset: -offset
      };
      offset += dash;
      return ring;
    });

    return { total: sum, rings: out };
  }, [segments, size, stroke]);

  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Donut chart"
    >
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />

      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {rings.map((r) => (
          <circle
            key={r.label}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={r.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={r.dasharray}
            strokeDashoffset={r.dashoffset}
          />
        ))}
      </g>

      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill="rgba(235,241,255,0.62)"
        fontSize="12"
        fontWeight="800"
      >
        {centerLabel || "Total"}
      </text>
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fill="rgba(235,241,255,0.92)"
        fontSize="36"
        fontWeight="900"
      >
        {centerValue ?? formatNumber(total)}
      </text>
    </svg>
  );
}

