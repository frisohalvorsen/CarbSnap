export default function DualBarChart({ data, onTap, activeKey }) {
  const max = Math.max(10, ...data.flatMap((d) => [d.carbs, d.protein]));
  const barW = 12, gap = 3, groupW = barW * 2 + gap, groupGap = 16;
  const chartH = 150;
  const chartW = data.length * (groupW + groupGap);

  return (
    <div className="overflow-x-auto">
      <svg width={chartW} height={chartH + 32} className="block">
        <defs>
          <linearGradient id="carbG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c"/>
            <stop offset="100%" stopColor="#ea580c"/>
          </linearGradient>
          <linearGradient id="protG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8"/>
            <stop offset="100%" stopColor="#4338ca"/>
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const x = i * (groupW + groupGap);
          const carbH = Math.max(2, (d.carbs / max) * chartH);
          const protH = Math.max(2, (d.protein / max) * chartH);
          const isActive = activeKey === d.key;
          return (
            <g key={d.key} transform={`translate(${x}, 0)`}
              onClick={() => onTap?.(d.key)} style={{ cursor: onTap ? "pointer" : "default" }}>
              {/* Active highlight */}
              {isActive && (
                <rect x={-4} y={0} width={groupW + 8} height={chartH + 4}
                  rx="6" fill="#f1f5f9" opacity="0.8"/>
              )}
              {/* Carb bar */}
              <rect x={0} y={chartH - carbH} width={barW} height={carbH} rx="4" fill="url(#carbG)"
                opacity={isActive ? 1 : 0.9}/>
              {/* Protein bar */}
              <rect x={barW + gap} y={chartH - protH} width={barW} height={protH} rx="4" fill="url(#protG)"
                opacity={isActive ? 1 : 0.9}/>
              {/* Label */}
              <text x={groupW / 2} y={chartH + 18} textAnchor="middle" fontSize="10"
                fontWeight={isActive ? 800 : 600} fill={isActive ? "#0f172a" : "#94a3b8"}>
                {d.label}
              </text>
              {/* Value labels on active */}
              {isActive && (
                <>
                  <text x={barW/2} y={chartH - carbH - 4} textAnchor="middle" fontSize="9" fill="#ea580c" fontWeight="800">
                    {Math.round(d.carbs)}
                  </text>
                  <text x={barW + gap + barW/2} y={chartH - protH - 4} textAnchor="middle" fontSize="9" fill="#4338ca" fontWeight="800">
                    {Math.round(d.protein)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
