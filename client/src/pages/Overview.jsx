import { useMemo, useState } from "react";
import { loadEntries, loadProfile, startOfDay } from "../lib/storage.js";
import { loadTraining } from "../lib/training.js";
import { computeWeekAdjustment } from "../lib/nutrition.js";
import { TYPES } from "./Training.jsx";
import DualBarChart from "../components/BarChart.jsx";
import LineChart from "../components/LineChart.jsx";
import MealCard from "../components/MealCard.jsx";

export default function Overview({ refreshKey }) {
  const [range, setRange] = useState("week");
  const [query, setQuery] = useState("");
  const [activeDay, setActiveDay] = useState(null);
  const [chartMode, setChartMode] = useState("bar");
  const all      = useMemo(() => loadEntries(),  [refreshKey]);
  const training = useMemo(() => loadTraining(), [refreshKey]);
  const profile  = useMemo(() => loadProfile(),  [refreshKey]);

  const days = range === "week" ? 7 : 30;
  const today = startOfDay(Date.now());

  const buckets = useMemo(() => {
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = today - i * 86400000;
      const dayEnd = day + 86400000;
      const meals = all.filter((e) => e.timestamp >= day && e.timestamp < dayEnd);
      const carbs    = meals.reduce((s, e) => s + (e.carbs    || 0), 0);
      const protein  = meals.reduce((s, e) => s + (e.protein  || 0), 0);
      const calories = meals.reduce((s, e) => s + (e.calories || 0), 0);
      const d = new Date(day);
      const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const trainSessions = training[dk] || [];
      const label = range === "week"
        ? d.toLocaleDateString(undefined, { weekday: "short" })
        : String(d.getDate());
      arr.push({ key: day, label, carbs, protein, calories, meals, trainSessions });
    }
    return arr;
  }, [all, training, days, range, today]);

  const avgCarbs   = buckets.reduce((s,b) => s + b.carbs,   0) / days;
  const avgProtein = buckets.reduce((s,b) => s + b.protein, 0) / days;
  const avgCals    = buckets.reduce((s,b) => s + b.calories,0) / days;

  const half = Math.floor(days / 2);
  const firstP  = buckets.slice(0, half).reduce((s,b) => s + b.protein, 0) / Math.max(1, half);
  const secondP = buckets.slice(half).reduce((s,b) => s + b.protein, 0) / Math.max(1, days - half);
  const trend = secondP - firstP;

  const activeMeals = activeDay ? (buckets.find(b => b.key === activeDay)?.meals || []) : [];
  const filteredMeals = query
    ? activeMeals.filter(e => e.foodName.toLowerCase().includes(query.toLowerCase()))
    : activeMeals;

  // Training vs rest day nutrition comparison
  const trainDays = buckets.filter(b => b.trainSessions.length > 0 && b.meals.length > 0);
  const restDays  = buckets.filter(b => b.trainSessions.length === 0 && b.meals.length > 0);
  const avg = (arr, key) => arr.length ? arr.reduce((s,b) => s + b[key], 0) / arr.length : null;
  const trainAvgProtein  = avg(trainDays, "protein");
  const restAvgProtein   = avg(restDays,  "protein");
  const trainAvgCarbs    = avg(trainDays, "carbs");
  const restAvgCarbs     = avg(restDays,  "carbs");
  const trainAvgCalories = avg(trainDays, "calories");
  const restAvgCalories  = avg(restDays,  "calories");
  const showComparison   = trainDays.length > 0 && restDays.length > 0;

  // Plan vs Actual: weekly-scaled training-load adjustment
  const totalEatenKcal = Math.round(buckets.reduce((s,b) => s + b.calories, 0));
  const adj = useMemo(
    () => computeWeekAdjustment(
      profile,
      buckets.map(b => ({ sessions: b.trainSessions })),
      days,
    ),
    [profile, buckets, days],
  );
  const sessionDelta       = adj.actualSessions - adj.plannedSessions;
  const avgAdjTargetKcal   = Math.round(adj.adjustedTargetKcal / days);
  const avgStaticTargetKcal= Math.round(adj.staticTargetKcal / days);
  const avgEatenKcal       = Math.round(totalEatenKcal / days);
  const avgTargetDelta     = avgAdjTargetKcal - avgStaticTargetKcal; // how much training shifted avg target
  const avgIntakeGap       = avgEatenKcal - avgAdjTargetKcal;       // +over / -under per day on average

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Analytics</p>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">Trends</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md">
            <span className="text-xl">📈</span>
          </div>
          <div className="flex bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
            {["week","month"].map(r => (
              <button key={r} onClick={() => { setRange(r); setActiveDay(null); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${range === r ? "bg-slate-900 text-white shadow" : "text-slate-500"}`}>
                {r === "week" ? "7d" : "30d"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Averages row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-3xl p-3 bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md shadow-orange-200/60 text-center">
          <div className="text-[9px] font-black uppercase tracking-wider opacity-80">Avg Carbs</div>
          <div className="hero-num text-2xl font-black">{round(avgCarbs)}<span className="text-xs opacity-80 ml-0.5">g</span></div>
          <div className="text-[9px] opacity-70">per day</div>
        </div>
        <div className="rounded-3xl p-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200/60 text-center">
          <div className="text-[9px] font-black uppercase tracking-wider opacity-80">Avg Protein</div>
          <div className="hero-num text-2xl font-black">{round(avgProtein)}<span className="text-xs opacity-80 ml-0.5">g</span></div>
          <div className={`text-[9px] font-bold mt-0.5 ${trend >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(round(trend))}g trend
          </div>
        </div>
        <div className="rounded-3xl p-3 bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-200/60 text-center">
          <div className="text-[9px] font-black uppercase tracking-wider opacity-80">Avg Cals</div>
          <div className="hero-num text-2xl font-black">{Math.round(avgCals)}<span className="text-[9px] opacity-80 ml-0.5">kcal</span></div>
          <div className="text-[9px] opacity-70">per day</div>
        </div>
      </div>

      {/* Plan vs Actual */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-black text-slate-900 text-sm flex items-center gap-2">
            <span>🎯</span> Plan vs Actual
          </div>
          <span className="text-[10px] font-bold text-slate-400">{range === "week" ? "this week" : "last 30 days"}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Trainings */}
          <div className="rounded-2xl bg-slate-50 p-2.5 text-center space-y-0.5">
            <div className="text-[9px] font-bold uppercase text-slate-400">Trainings</div>
            <div className="hero-num text-lg font-black text-slate-900 leading-none">
              {adj.actualSessions}<span className="text-slate-300 font-bold"> / {adj.plannedSessions}</span>
            </div>
            <div className={`text-[10px] font-bold ${sessionDelta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {sessionDelta >= 0 ? "+" : ""}{sessionDelta} vs plan
            </div>
          </div>

          {/* Adjusted target */}
          <div className="rounded-2xl bg-slate-50 p-2.5 text-center space-y-0.5">
            <div className="text-[9px] font-bold uppercase text-slate-400">Avg target</div>
            <div className="hero-num text-lg font-black text-amber-600 leading-none">
              {avgAdjTargetKcal}<span className="text-[10px] opacity-70">kcal</span>
            </div>
            <div className={`text-[10px] font-bold ${avgTargetDelta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {avgTargetDelta >= 0 ? "+" : ""}{avgTargetDelta} vs plan
            </div>
          </div>

          {/* Eaten vs adjusted target */}
          <div className="rounded-2xl bg-slate-50 p-2.5 text-center space-y-0.5">
            <div className="text-[9px] font-bold uppercase text-slate-400">Avg eaten</div>
            <div className="hero-num text-lg font-black text-slate-900 leading-none">
              {avgEatenKcal}<span className="text-[10px] opacity-70">kcal</span>
            </div>
            <div className={`text-[10px] font-bold ${Math.abs(avgIntakeGap) < 150 ? "text-slate-500" : avgIntakeGap > 0 ? "text-orange-500" : "text-indigo-500"}`}>
              {avgIntakeGap >= 0 ? "+" : ""}{avgIntakeGap} kcal/day
            </div>
          </div>
        </div>

        {/* Plain-English summary */}
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {adj.actualSessions === 0 && adj.plannedSessions === 0
            ? "No training planned or logged for this period."
            : (
              <>
                You did <b>{adj.actualSessions}</b> session{adj.actualSessions === 1 ? "" : "s"}{" "}
                vs <b>{adj.plannedSessions}</b> planned ({adj.actualKcal} vs {adj.plannedKcal} kcal burned in total).{" "}
                On average you{" "}
                {avgIntakeGap >= 0
                  ? <><b>ate {avgIntakeGap} kcal/day over</b> your target.</>
                  : <><b>ate {-avgIntakeGap} kcal/day under</b> your target.</>}
              </>
            )}
        </p>

        {adj.macroHint && (
          <div className="text-[11px] font-bold text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
            💡 {adj.macroHint}
          </div>
        )}
      </div>

      {/* Chart type toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block"></span> Carbs
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block"></span> Protein
          </span>
        </div>
        <div className="flex bg-white/80 rounded-full p-0.5 shadow-sm border border-slate-200/60">
          {[["bar","Bar"],["line","Line"]].map(([id,label]) => (
            <button key={id} onClick={() => setChartMode(id)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition ${chartMode === id ? "bg-slate-900 text-white shadow" : "text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="card p-4 space-y-3">
        {chartMode === "bar"
          ? <DualBarChart data={buckets} onTap={k => setActiveDay(k === activeDay ? null : k)} activeKey={activeDay} />
          : <LineChart data={buckets} height={150} />
        }
        {/* Training markers row */}
        <div className="flex border-t border-slate-100 pt-2">
          {buckets.map(b => {
            const types = [...new Set((b.trainSessions||[]).map(s=>s.type))];
            return (
              <div key={b.key} className="flex-1 flex justify-center gap-px">
                {types.slice(0,2).map(t => (
                  <span key={t} title={t} className="text-[10px]">{TYPES[t]?.emoji || "✨"}</span>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Training vs rest day comparison */}
      {showComparison && (
        <div className="card p-4 space-y-3">
          <div className="font-black text-slate-900 text-sm flex items-center gap-2">
            <span>⚡</span> Training day vs Rest day
          </div>
          <div className="grid grid-cols-3 gap-2">
            <CompareCol label="Protein" trainVal={trainAvgProtein} restVal={restAvgProtein} unit="g" color="text-indigo-600"/>
            <CompareCol label="Carbs"   trainVal={trainAvgCarbs}   restVal={restAvgCarbs}   unit="g" color="text-orange-500"/>
            <CompareCol label="Calories" trainVal={trainAvgCalories} restVal={restAvgCalories} unit="" color="text-amber-600"/>
          </div>
          <p className="text-[10px] text-slate-400">{trainDays.length} training days · {restDays.length} rest days in this period</p>
        </div>
      )}

      {/* Tap a day to expand meals */}
      {activeDay && chartMode === "bar" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900">
              📅 {new Date(activeDay).toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" })}
            </h2>
            <button onClick={() => setActiveDay(null)} className="pill bg-slate-100 text-slate-500">Close</button>
          </div>
          {/* Day totals */}
          {(() => {
            const b = buckets.find(b => b.key === activeDay);
            if (!b || b.meals.length === 0) return null;
            return (
              <div className="grid grid-cols-2 gap-2">
                <div className="pastel-carb rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-black uppercase text-orange-700">Carbs</div>
                  <div className="text-2xl font-black text-orange-500 hero-num">{round(b.carbs)}<span className="text-xs ml-0.5">g</span></div>
                </div>
                <div className="pastel-protein rounded-2xl p-3 text-center">
                  <div className="text-[10px] font-black uppercase text-indigo-700">Protein</div>
                  <div className="text-2xl font-black text-indigo-500 hero-num">{round(b.protein)}<span className="text-xs ml-0.5">g</span></div>
                </div>
              </div>
            );
          })()}
          <input className="input" placeholder="🔍 Search meals…"
            value={query} onChange={e => setQuery(e.target.value)} />
          {filteredMeals.length === 0
            ? <div className="card p-6 text-center text-slate-500 text-sm">No meals logged.</div>
            : filteredMeals.map(e => <MealCard key={e.id} entry={e} />)
          }
        </div>
      )}

      {/* No data state */}
      {buckets.every(b => b.meals.length === 0) && (
        <div className="card p-10 text-center space-y-2">
          <div className="text-5xl">📊</div>
          <div className="font-black text-slate-700">No data yet</div>
          <div className="text-sm text-slate-400">Start logging meals to see your trends here.</div>
        </div>
      )}
    </div>
  );
}

function CompareCol({ label, trainVal, restVal, unit, color }) {
  const diff = trainVal != null && restVal != null ? trainVal - restVal : null;
  return (
    <div className="rounded-2xl bg-slate-50 p-2.5 text-center space-y-1">
      <div className="text-[9px] font-bold uppercase text-slate-400">{label}</div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 justify-between">
          <span className="text-[9px] text-rose-500 font-bold">⚡</span>
          <span className={`hero-num text-sm font-black ${color}`}>{Math.round(trainVal)}{unit}</span>
        </div>
        <div className="flex items-center gap-1 justify-between">
          <span className="text-[9px] text-slate-400 font-bold">🌿</span>
          <span className="hero-num text-sm font-bold text-slate-500">{Math.round(restVal)}{unit}</span>
        </div>
      </div>
      {diff != null && (
        <div className={`text-[9px] font-bold ${diff >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
          {diff >= 0 ? "+" : ""}{Math.round(diff)}{unit}
        </div>
      )}
    </div>
  );
}

function round(n) { return Math.round(Number(n || 0) * 10) / 10; }
