import { useMemo, useState } from "react";
import { loadEntries, deleteEntry, isSameDay, loadProfile } from "../lib/storage.js";
import { loadTraining, todayKey } from "../lib/training.js";
import { TYPES } from "./Training.jsx";
import MealCard from "../components/MealCard.jsx";
import ProteinRing from "../components/ProteinRing.jsx";

/* ── Inline SVG illustrations ─────────────────────────────────────────── */
const IllustrationGrain = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <ellipse cx="32" cy="48" rx="14" ry="6" fill="#fed7aa" opacity=".6"/>
    <rect x="29" y="18" width="6" height="28" rx="3" fill="#f97316"/>
    {[[-10,-8],[10,-8],[-14,2],[14,2],[-10,12],[10,12]].map(([dx,dy],i)=>(
      <ellipse key={i} cx={32+dx} cy={32+dy} rx="7" ry="4"
        transform={`rotate(${dx<0?-30:30} ${32+dx} ${32+dy})`}
        fill="#fb923c" opacity={0.7+i*0.05}/>
    ))}
  </svg>
);

const IllustrationDumbbell = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <rect x="6"  y="26" width="12" height="12" rx="4" fill="#a5b4fc"/>
    <rect x="46" y="26" width="12" height="12" rx="4" fill="#a5b4fc"/>
    <rect x="8"  y="22" width="8"  height="20" rx="3" fill="#6366f1"/>
    <rect x="48" y="22" width="8"  height="20" rx="3" fill="#6366f1"/>
    <rect x="16" y="29" width="32" height="6"  rx="3" fill="#818cf8"/>
  </svg>
);

const IllustrationFlame = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <path d="M32 54c-10 0-17-7-17-16 0-6 3-11 7-15 0 5 3 8 6 9-1-5 2-12 8-16 0 6 4 9 7 10 2-3 3-7 2-11 4 4 6 10 6 14 0 14-9 25-19 25z"
      fill="url(#fg1)"/>
    <path d="M32 46c-4 0-8-3-8-8 0-3 2-6 4-8 0 3 2 5 4 5-1-3 1-6 4-8 0 3 2 5 3 5 1-2 1-4 1-6 2 2 3 5 3 7 0 7-5 13-11 13z"
      fill="#fef3c7"/>
    <defs>
      <linearGradient id="fg1" x1="32" y1="12" x2="32" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f59e0b"/>
        <stop offset="1" stopColor="#ef4444"/>
      </linearGradient>
    </defs>
  </svg>
);

const IllustrationAvocado = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <ellipse cx="32" cy="36" rx="16" ry="20" fill="#4ade80"/>
    <ellipse cx="32" cy="32" rx="13" ry="17" fill="#86efac"/>
    <ellipse cx="32" cy="38" rx="8"  ry="10" fill="#a16207"/>
    <ellipse cx="32" cy="38" rx="6"  ry="8"  fill="#ca8a04"/>
  </svg>
);

/* ── Metric tile ──────────────────────────────────────────────────────── */
function MetricTile({ label, value, unit, sub, tileClass, illustration, accent }) {
  return (
    <div className={`rounded-3xl p-4 flex flex-col h-44 ${tileClass}`}>
      <div className={`text-xs font-bold ${accent} mb-1`}>{label}</div>
      <div className="flex-1 flex items-center justify-end pr-1">
        {illustration}
      </div>
      <div>
        <div className={`hero-num text-3xl font-black leading-none ${accent}`}>
          {value}<span className="text-sm font-bold opacity-70 ml-1">{unit}</span>
        </div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Progress summary card (like "Health Score") ─────────────────────── */
function DailySummary({ totals, proteinGoal, calorieGoal }) {
  const pPct = proteinGoal > 0 ? Math.min(100, Math.round((totals.protein / proteinGoal) * 100)) : 0;
  const cPct = calorieGoal > 0 ? Math.min(100, Math.round((totals.calories / calorieGoal) * 100)) : 0;
  const score = Math.round((pPct + Math.min(100, cPct)) / 2);

  const msg =
    score >= 80 ? "You're crushing it today! 🔥" :
    score >= 50 ? "Good progress — keep going! 💪" :
    totals.protein + totals.calories === 0 ? "Log your first meal to start." :
    "Early days — keep logging! 🌱";

  return (
    <div className="rounded-3xl p-4 bg-gradient-to-r from-pink-200/80 via-orange-100/80 to-amber-100/80 flex items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/70 flex-shrink-0 flex flex-col items-center justify-center shadow-sm">
        <span className="hero-num text-2xl font-black text-orange-500">{score}</span>
        <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide">score</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-slate-800">Daily Progress</div>
        <div className="text-xs text-slate-600 mt-0.5">{msg}</div>
        <div className="mt-2 space-y-1">
          <ProgressBar label="Protein" pct={pPct} color="bg-indigo-400"/>
          <ProgressBar label="Calories" pct={cPct} color="bg-amber-400"/>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, pct, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-slate-500 w-12">{label}</span>
      <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-[10px] font-bold text-slate-500 w-7 text-right">{pct}%</span>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */
export default function Today({ refreshKey, onChange }) {
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const all      = useMemo(() => loadEntries(),  [refreshKey, tick]);
  const profile  = useMemo(() => loadProfile(),  [refreshKey, tick]);
  const training = useMemo(() => loadTraining(), [refreshKey, tick]);
  const todaySessions = training[todayKey()] || [];

  const todays = all.filter(e => isSameDay(e.timestamp, Date.now()));
  const filtered = query
    ? todays.filter(e => e.foodName.toLowerCase().includes(query.toLowerCase()))
    : todays;

  const totals = todays.reduce(
    (a, e) => ({ carbs: a.carbs+(e.carbs||0), protein: a.protein+(e.protein||0),
      calories: a.calories+(e.calories||0), fat: a.fat+(e.fat||0),
      sugar: a.sugar+(e.sugar||0), fiber: a.fiber+(e.fiber||0) }),
    { carbs:0, protein:0, calories:0, fat:0, sugar:0, fiber:0 }
  );

  function handleDelete(id) { deleteEntry(id); setTick(t=>t+1); onChange?.(); }

  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString(undefined, { weekday:"short", day:"numeric", month:"short" });

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{dateStr}</p>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">{greeting}! 👋</h1>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-md">
          <span className="text-xl">🏋️</span>
        </div>
      </div>

      {/* Daily score / summary */}
      <DailySummary totals={totals} proteinGoal={profile.proteinGoal||144} calorieGoal={profile.calorieGoal||2400}/>

      {/* 2×2 metric grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          label="Carbs" value={round(totals.carbs)} unit="g"
          sub={`Sugar: ${round(totals.sugar)}g · Fiber: ${round(totals.fiber)}g`}
          tileClass="tile-carb" accent="text-orange-600"
          illustration={<IllustrationGrain/>}
        />
        <MetricTile
          label="Protein" value={round(totals.protein)} unit="g"
          sub={`Goal: ${profile.proteinGoal||144}g`}
          tileClass="tile-protein" accent="text-indigo-600"
          illustration={<IllustrationDumbbell/>}
        />
        <MetricTile
          label="Calories" value={Math.round(totals.calories)} unit="kcal"
          sub={`Goal: ${profile.calorieGoal||2400} kcal`}
          tileClass="tile-cal" accent="text-amber-600"
          illustration={<IllustrationFlame/>}
        />
        <MetricTile
          label="Fat" value={round(totals.fat)} unit="g"
          sub={`${todays.length} meal${todays.length!==1?"s":""} today`}
          tileClass="tile-fat" accent="text-emerald-700"
          illustration={<IllustrationAvocado/>}
        />
      </div>

      {/* Protein ring strip */}
      <div className="card p-4 flex items-center gap-4">
        <ProteinRing value={totals.protein} goal={profile.proteinGoal||144} size={110}/>
        <div className="flex-1 space-y-2">
          <div className="font-black text-slate-900">Protein target</div>
          <div className="text-sm text-slate-500">
            {Math.max(0, (profile.proteinGoal||144) - totals.protein) > 0
              ? `${round(Math.max(0,(profile.proteinGoal||144)-totals.protein))}g remaining to hit your goal`
              : "Daily protein goal reached! 🎉"}
          </div>
          <div className="text-xs text-slate-400">Set your goal in Profile → Goal</div>
        </div>
      </div>

      {/* Training status card */}
      <TrainingCard sessions={todaySessions} proteinGoal={profile.proteinGoal||144} proteinEaten={totals.protein}/>

      {/* Search + meal list */}
      <input className="input" placeholder="🔍  Search today's meals…"
        value={query} onChange={e=>setQuery(e.target.value)}/>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card p-10 text-center space-y-2">
            <div className="text-5xl">🍽️</div>
            <div className="font-black text-slate-700 text-lg">
              {todays.length===0 ? "No meals yet" : "No matches"}
            </div>
            <div className="text-sm text-slate-400">
              {todays.length===0 ? "Tap Capture to log your first meal today." : "Try a different search term."}
            </div>
          </div>
        )}
        {filtered.map(e => <MealCard key={e.id} entry={e} onDelete={handleDelete}/>)}
      </div>
    </div>
  );
}

function TrainingCard({ sessions, proteinGoal, proteinEaten }) {
  const trained = sessions.length > 0;
  const remaining = Math.max(0, proteinGoal - proteinEaten);

  if (!trained) {
    return (
      <div className="rounded-3xl px-4 py-3 bg-slate-100/80 flex items-center gap-3">
        <span className="text-2xl">🌿</span>
        <div>
          <div className="font-bold text-slate-700 text-sm">Rest day</div>
          <div className="text-xs text-slate-400">Log a workout in the Train tab</div>
        </div>
      </div>
    );
  }

  const types = [...new Set(sessions.map(s => s.type))];
  const totalDuration = sessions.reduce((s, x) => s + (x.duration || 0), 0);
  const firstType = TYPES[types[0]] || TYPES.Other;

  return (
    <div className={`rounded-3xl p-4 bg-gradient-to-r ${firstType.grad} text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Training day 🔥</div>
          <div className="font-black text-lg mt-0.5">
            {types.map(t => TYPES[t]?.emoji || "✨").join(" ")} {types.join(" + ")}
          </div>
          <div className="text-xs opacity-75 mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            {totalDuration > 0 ? ` · ${totalDuration} min total` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-75">Protein left</div>
          <div className="hero-num text-2xl font-black">{Math.round(remaining)}<span className="text-xs opacity-75 ml-0.5">g</span></div>
          <div className="text-[10px] opacity-60">{remaining > 0 ? "keep eating 💪" : "goal hit ✓"}</div>
        </div>
      </div>
    </div>
  );
}

function round(n) { return Math.round(Number(n||0)*10)/10; }
