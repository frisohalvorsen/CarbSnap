export default function ProteinRing({ value, goal, size = 160 }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const dash = c * pct;
  const remaining = Math.max(0, goal - value);
  const hit = value >= goal;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} stroke="#e8e8f4" strokeWidth={stroke} fill="none"/>
        {/* Progress */}
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke="url(#pRingGrad)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          fill="none"
          style={{ transition: "stroke-dasharray 700ms cubic-bezier(.4,0,.2,1)" }}
        />
        <defs>
          <linearGradient id="pRingGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa"/>
            <stop offset="100%" stopColor="#6366f1"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg mb-0.5">💪</span>
        <div className="hero-num text-2xl font-black text-indigo-600 leading-none">
          {Math.round(value)}
          <span className="text-xs font-bold opacity-60">g</span>
        </div>
        <div className="text-[10px] text-slate-400 font-semibold">of {Math.round(goal)}g</div>
        {hit
          ? <div className="text-[10px] text-emerald-500 font-bold mt-0.5">Goal hit ✓</div>
          : <div className="text-[10px] text-slate-400 mt-0.5">{Math.round(remaining)}g left</div>
        }
      </div>
    </div>
  );
}
