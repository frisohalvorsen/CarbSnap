import ConfidenceBadge from "./ConfidenceBadge.jsx";

export default function MealCard({ entry, onDelete }) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="card-solid overflow-hidden">
      <div className="flex">
        {entry.imageThumbnail ? (
          <img src={entry.imageThumbnail} alt="" className="w-24 h-24 object-cover flex-shrink-0 rounded-l-3xl" />
        ) : (
          <div className="w-24 h-24 pastel-carb flex items-center justify-center text-4xl flex-shrink-0 rounded-l-3xl">
            🍽
          </div>
        )}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="font-black text-slate-900 truncate text-sm">{entry.foodName}</div>
              <div className="text-xs text-slate-400 mt-0.5">{entry.portionLabel} · {time}</div>
            </div>
            <ConfidenceBadge value={entry.confidence} />
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <div className="pastel-carb rounded-2xl px-2.5 py-1.5">
              <div className="text-[9px] font-black uppercase text-orange-600 tracking-wide">Carbs</div>
              <div className="text-lg font-black text-orange-500 hero-num leading-tight">
                {round(entry.carbs)}<span className="text-xs font-bold ml-0.5">g</span>
              </div>
            </div>
            <div className="pastel-protein rounded-2xl px-2.5 py-1.5">
              <div className="text-[9px] font-black uppercase text-indigo-600 tracking-wide">Protein</div>
              <div className="text-lg font-black text-indigo-500 hero-num leading-tight">
                {round(entry.protein)}<span className="text-xs font-bold ml-0.5">g</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
            <span>🔥 {round(entry.calories)} kcal · 🥑 {round(entry.fat)}g fat</span>
            {onDelete && (
              <button onClick={() => onDelete(entry.id)} className="text-slate-300 hover:text-rose-400 px-1 py-0.5 transition-colors">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function round(n) { return Math.round(Number(n || 0) * 10) / 10; }
