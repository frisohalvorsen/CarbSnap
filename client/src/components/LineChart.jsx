export default function LineChart({ data, height = 140 }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-xs" style={{ height }}>
        Not enough data yet
      </div>
    );
  }

  const padL = 32, padR = 12, padT = 12, padB = 24;
  const W = 320;
  const H = height;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxCarbs   = Math.max(1, ...data.map(d => d.carbs));
  const maxProtein = Math.max(1, ...data.map(d => d.protein));
  const maxVal = Math.max(maxCarbs, maxProtein, 10);

  const xOf = (i) => padL + (i / (data.length - 1)) * innerW;
  const yOf = (v) => padT + innerH - (v / maxVal) * innerH;

  function smoothPath(points) {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  function areaPath(points, yBase) {
    if (points.length < 2) return "";
    const line = smoothPath(points);
    return `${line} L ${points[points.length-1].x} ${yBase} L ${points[0].x} ${yBase} Z`;
  }

  const carbPts   = data.map((d, i) => ({ x: xOf(i), y: yOf(d.carbs) }));
  const protPts   = data.map((d, i) => ({ x: xOf(i), y: yOf(d.protein) }));
  const yBase = padT + innerH;

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: padT + innerH * (1 - f),
    label: Math.round(maxVal * f),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="carbAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="protAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map(({ y, label }) => (
        <g key={y}>
          <line x1={padL} y1={y} x2={W - padR} y2={y}
            stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3"/>
          <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{label}</text>
        </g>
      ))}

      {/* Area fills */}
      <path d={areaPath(carbPts, yBase)} fill="url(#carbAreaGrad)"/>
      <path d={areaPath(protPts, yBase)} fill="url(#protAreaGrad)"/>

      {/* Lines */}
      <path d={smoothPath(carbPts)} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
      <path d={smoothPath(protPts)} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Dots + x-labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(d.carbs)}   r="3.5" fill="#f97316" stroke="white" strokeWidth="1.5"/>
          <circle cx={xOf(i)} cy={yOf(d.protein)} r="3.5" fill="#6366f1" stroke="white" strokeWidth="1.5"/>
          {/* X-axis label — skip every other on month view */}
          {(data.length <= 10 || i % Math.ceil(data.length / 10) === 0) && (
            <text x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
