export function MacroHero({ carbs, protein }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Carbs */}
      <div className="rounded-3xl p-4 bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-200">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-lg">🌾</span>
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">Carbs</div>
        </div>
        <div className="hero-num text-5xl font-black leading-none">
          {fmt(carbs)}
          <span className="text-base font-bold opacity-80 ml-1">g</span>
        </div>
      </div>
      {/* Protein */}
      <div className="rounded-3xl p-4 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-lg">💪</span>
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">Protein</div>
        </div>
        <div className="hero-num text-5xl font-black leading-none">
          {fmt(protein)}
          <span className="text-base font-bold opacity-80 ml-1">g</span>
        </div>
      </div>
    </div>
  );
}

export function SecondaryMacros({ calories, fat, sugar, fiber }) {
  const items = [
    { label: "Calories", value: fmt(calories), unit: "kcal", bg: "pastel-cal",   icon: "🔥" },
    { label: "Fat",      value: fmt(fat),      unit: "g",    bg: "pastel-green", icon: "🥑" },
    { label: "Sugar",    value: fmt(sugar),    unit: "g",    bg: "pastel-pink",  icon: "🍬" },
    { label: "Fiber",    value: fmt(fiber),    unit: "g",    bg: "pastel-green", icon: "🌿" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((i) => (
        <div key={i.label} className={`rounded-2xl p-2 text-center ${i.bg}`}>
          <div className="text-base leading-none mb-0.5">{i.icon}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{i.label}</div>
          <div className="text-sm font-black text-slate-800 hero-num">{i.value}</div>
          <div className="text-[10px] text-slate-400">{i.unit}</div>
        </div>
      ))}
    </div>
  );
}

function fmt(n) {
  if (n == null || isNaN(n)) return "—";
  return Math.round(Number(n) * 10) / 10;
}
