import { useEffect, useState } from "react";
import { loadProfile, saveProfile } from "../lib/storage.js";
import { computeNutritionPlan } from "../lib/nutrition.js";

const DEFAULTS = {
  sex:"male", age:30, heightCm:175, weightKg:80, bodyFatPct:15,
  sportType:"strength", trainingDaysPerWeek:4, goal:"build", pace:"moderate",
  proteinGoal:0, calorieGoal:0,
};

/* ── Inline SVG illustrations ──────────────────────────────────────────── */
const RunnerSVG = () => (
  <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
    <circle cx="50" cy="14" r="7" fill="#a78bfa"/>
    <path d="M50 21 L44 38 L32 45 M50 21 L56 36 L66 34 M44 38 L40 52 L34 60 M56 36 L58 52 L52 60"
      stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M32 45 L28 48" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const ScaleSVG = () => (
  <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
    <rect x="20" y="48" width="40" height="14" rx="7" fill="#fde68a"/>
    <ellipse cx="40" cy="46" rx="22" ry="18" fill="#fef3c7" stroke="#fbbf24" strokeWidth="2"/>
    <path d="M40 34 L40 42 M36 38 L44 38" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
    <text x="40" y="46" textAnchor="middle" fontSize="11" fontWeight="800" fill="#d97706" dominantBaseline="middle">kg</text>
  </svg>
);

const MacroPieSVG = ({ carbPct, proteinPct, fatPct }) => {
  const r = 28, cx = 40, cy = 40;
  const slice = (start, pct, color) => {
    if (pct <= 0) return null;
    const a0 = (start / 100) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((start + pct) / 100) * 2 * Math.PI - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = pct > 50 ? 1 : 0;
    return <path d={`M${cx},${cy} L${x0},${y0} A${r},${r},0,${large},1,${x1},${y1}Z`} fill={color}/>;
  };
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      {slice(0, carbPct, "#f97316")}
      {slice(carbPct, proteinPct, "#6366f1")}
      {slice(carbPct + proteinPct, fatPct, "#4ade80")}
      <circle cx={cx} cy={cy} r="14" fill="white"/>
    </svg>
  );
};

/* ── Reusable sub-components ───────────────────────────────────────────── */
function Seg({ options, value, onChange }) {
  return (
    <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
      {options.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            value === id ? "bg-white shadow text-slate-900" : "text-slate-400"
          }`}>{label}</button>
      ))}
    </div>
  );
}

function Field({ label, right, children }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
        {right && <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{right}</span>}
      </div>
      {children}
    </div>
  );
}

function SelectCard({ options, value, onChange }) {
  return (
    <div className="space-y-2">
      {options.map(([id, label, desc, emoji]) => (
        <button key={id} onClick={() => onChange(id)}
          className={`w-full text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
            value === id ? "border-slate-800 bg-white shadow-sm" : "border-transparent bg-slate-50"
          }`}>
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="font-bold text-slate-900 text-sm">{label}</div>
            <div className="text-xs text-slate-500">{desc}</div>
          </div>
          {value === id && <div className="ml-auto w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white"/>
          </div>}
        </button>
      ))}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function Profile({ onChange }) {
  const [p, setP] = useState(() => ({ ...DEFAULTS, ...loadProfile() }));
  const [saved, setSaved] = useState(false);
  const plan = computeNutritionPlan(p);

  useEffect(() => {
    saveProfile({ ...p, proteinGoal: plan.proteinG, calorieGoal: plan.targetCalories });
    onChange?.();
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [p.sex, p.age, p.heightCm, p.weightKg, p.bodyFatPct,
      p.sportType, p.trainingDaysPerWeek, p.goal, p.pace]);

  const set = (k, v) => setP(c => ({ ...c, [k]: v }));

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Settings</p>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">Profile & Goal</h1>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md">
          <span className="text-xl">🎯</span>
        </div>
      </div>

      {/* ── Results panel ──────────────────────────────────────────── */}

      {/* Calorie target hero (like Health Score card) */}
      <div className="rounded-3xl overflow-hidden relative" style={{background:"linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)"}}>
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl"/>
        <div className="p-5 flex items-center gap-4 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex-shrink-0 flex flex-col items-center justify-center">
            <span className="hero-num text-3xl font-black text-white leading-none">{plan.targetCalories}</span>
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wide">kcal/day</span>
          </div>
          <div>
            <p className="text-white/70 text-xs font-semibold">Daily calorie target</p>
            <p className="text-white font-black text-lg leading-tight">Based on your<br/>profile & goal</p>
            <p className="text-white/60 text-xs mt-1">BMR {plan.bmr} · TDEE {plan.tdee}</p>
          </div>
          {saved && <div className="absolute top-3 right-4 bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-full">Saved ✓</div>}
        </div>
      </div>

      {/* Macro tiles 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="tile-carb rounded-3xl p-4 flex items-center gap-3">
          <div>
            <div className="text-[10px] font-black uppercase text-orange-600">Carbs</div>
            <div className="hero-num text-3xl font-black text-orange-500 leading-none">
              {plan.carbG}<span className="text-sm opacity-70 ml-0.5">g</span>
            </div>
            <div className="text-[10px] text-orange-400 mt-0.5">{plan.carbPct}% of calories</div>
          </div>
          <div className="ml-auto text-3xl">🌾</div>
        </div>
        <div className="tile-protein rounded-3xl p-4 flex items-center gap-3">
          <div>
            <div className="text-[10px] font-black uppercase text-indigo-600">Protein</div>
            <div className="hero-num text-3xl font-black text-indigo-500 leading-none">
              {plan.proteinG}<span className="text-sm opacity-70 ml-0.5">g</span>
            </div>
            <div className="text-[10px] text-indigo-400 mt-0.5">{plan.proteinPct}% of calories</div>
          </div>
          <div className="ml-auto text-3xl">💪</div>
        </div>
        <div className="tile-fat rounded-3xl p-4 flex items-center gap-3 col-span-1">
          <div>
            <div className="text-[10px] font-black uppercase text-emerald-700">Fat</div>
            <div className="hero-num text-3xl font-black text-emerald-600 leading-none">
              {plan.fatG}<span className="text-sm opacity-70 ml-0.5">g</span>
            </div>
            <div className="text-[10px] text-emerald-500 mt-0.5">{plan.fatPct}% of calories</div>
          </div>
          <div className="ml-auto text-3xl">🥑</div>
        </div>
        {/* Macro pie chart tile */}
        <div className="card p-4 flex flex-col items-center justify-center gap-1">
          <MacroPieSVG carbPct={plan.carbPct} proteinPct={plan.proteinPct} fatPct={plan.fatPct}/>
          <div className="flex gap-2 text-[9px] font-bold">
            <span className="text-orange-500">C {plan.carbPct}%</span>
            <span className="text-indigo-500">P {plan.proteinPct}%</span>
            <span className="text-emerald-600">F {plan.fatPct}%</span>
          </div>
        </div>
      </div>

      {/* ── Inputs ─────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-5">
        <h2 className="font-black text-slate-900 text-lg">Your details</h2>

        <Field label="Sex">
          <Seg options={[["male","👨 Male"],["female","👩 Female"]]} value={p.sex} onChange={v=>set("sex",v)}/>
        </Field>

        <Field label="Age" right={`${p.age} yr`}>
          <input type="range" min="16" max="80" step="1" value={p.age}
            onChange={e=>set("age",Number(e.target.value))} className="w-full accent-violet-500"/>
        </Field>

        <Field label="Height" right={`${p.heightCm} cm`}>
          <input type="range" min="140" max="220" step="1" value={p.heightCm}
            onChange={e=>set("heightCm",Number(e.target.value))} className="w-full accent-violet-500"/>
          <input type="number" value={p.heightCm} onChange={e=>set("heightCm",Number(e.target.value))}
            className="input mt-2"/>
        </Field>

        <Field label="Body weight" right={`${p.weightKg} kg`}>
          <input type="range" min="40" max="160" step="0.5" value={p.weightKg}
            onChange={e=>set("weightKg",Number(e.target.value))} className="w-full accent-violet-500"/>
          <input type="number" value={p.weightKg} step="0.5"
            onChange={e=>set("weightKg",Number(e.target.value))} className="input mt-2"/>
        </Field>

        <Field label="Body fat %" right={p.bodyFatPct > 0 ? `${p.bodyFatPct}%` : "unknown"}>
          <input type="range" min="0" max="50" step="0.5" value={p.bodyFatPct}
            onChange={e=>set("bodyFatPct",Number(e.target.value))} className="w-full accent-violet-500"/>
          {p.bodyFatPct > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Lean body mass: <span className="font-bold text-slate-700">{plan.lbm} kg</span>
            </p>
          )}
        </Field>
      </div>

      <div className="card p-5 space-y-5">
        <h2 className="font-black text-slate-900 text-lg">Sport type</h2>
        <SelectCard
          value={p.sportType} onChange={v=>set("sportType",v)}
          options={[
            ["none",     "Non-sporter",  "Little to no structured exercise",       "🧘"],
            ["endurance","Endurance",    "Running, cycling, swimming, rowing…",     "🏃"],
            ["strength", "Strength",     "Weightlifting, powerlifting, CrossFit…",  "🏋️"],
          ]}
        />
        {p.sportType !== "none" && (
          <Field label="Training sessions / week" right={`${p.trainingDaysPerWeek}×`}>
            <input type="range" min="1" max="7" step="1" value={p.trainingDaysPerWeek}
              onChange={e=>set("trainingDaysPerWeek",Number(e.target.value))} className="w-full accent-violet-500"/>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-0.5">
              {[1,2,3,4,5,6,7].map(n=><span key={n}>{n}</span>)}
            </div>
          </Field>
        )}
      </div>

      <div className="card p-5 space-y-5">
        <h2 className="font-black text-slate-900 text-lg">Your goal</h2>
        <SelectCard
          value={p.goal} onChange={v=>set("goal",v)}
          options={[
            ["lose",    "Lose weight",  "Calorie deficit — burn fat",         "🔥"],
            ["maintain","Maintain",     "Stay at current body composition",   "⚖️"],
            ["build",   "Build muscle", "Calorie surplus — maximise gains",   "💪"],
          ]}
        />
        {p.goal !== "maintain" && (
          <Field label={p.goal==="lose" ? "How fast to lose" : "Pace"}>
            <Seg
              value={p.pace} onChange={v=>set("pace",v)}
              options={[
                ["slow",     p.goal==="lose" ? "Slow −200" : "Lean +200"],
                ["moderate", p.goal==="lose" ? "Mod −450"  : "Mod +350"],
                ["fast",     p.goal==="lose" ? "Fast −700" : "Fast +500"],
              ]}
            />
            <p className="text-[10px] text-slate-400 mt-1 text-center">kcal/day adjustment vs TDEE of {plan.tdee} kcal</p>
          </Field>
        )}
      </div>

    </div>
  );
}
