import { useState, useMemo } from "react";
import {
  loadTraining, saveTraining, dateKey, todayKey, getDay, setDay,
  calcStreak, countInRange, calendarDays,
  MONTH_NAMES, DAY_NAMES, MIN_YEAR, MIN_MONTH, MAX_YEAR, MAX_MONTH,
} from "../lib/training.js";

/* ── Training type config ─────────────────────────────────────────────── */
export const TYPES = {
  HIIT:    { emoji:"⚡", label:"HIIT",    bg:"bg-rose-100",    dot:"bg-rose-500",    text:"text-rose-600",    grad:"from-rose-400 to-pink-500" },
  Boxing:  { emoji:"🥊", label:"Boxing",  bg:"bg-orange-100",  dot:"bg-orange-500",  text:"text-orange-600",  grad:"from-orange-400 to-amber-500" },
  Running: { emoji:"🏃", label:"Running", bg:"bg-emerald-100", dot:"bg-emerald-500", text:"text-emerald-700", grad:"from-emerald-400 to-teal-500" },
  Gym:     { emoji:"🏋️", label:"Gym",    bg:"bg-indigo-100",  dot:"bg-indigo-500",  text:"text-indigo-700",  grad:"from-indigo-400 to-violet-500" },
  Swim:    { emoji:"🏊", label:"Swim",    bg:"bg-blue-100",    dot:"bg-blue-500",    text:"text-blue-700",    grad:"from-blue-400 to-cyan-500" },
  Other:   { emoji:"✨", label:"Other",   bg:"bg-slate-100",   dot:"bg-slate-400",   text:"text-slate-600",   grad:"from-slate-400 to-slate-500" },
};

/* ── Helpers ──────────────────────────────────────────────────────────── */
function clampMonth(y, m) {
  if (y < MIN_YEAR || (y === MIN_YEAR && m < MIN_MONTH)) return [MIN_YEAR, MIN_MONTH];
  if (y > MAX_YEAR || (y === MAX_YEAR && m > MAX_MONTH)) return [MAX_YEAR, MAX_MONTH];
  return [y, m];
}
function isToday(y, m, d) {
  const t = new Date(); return t.getFullYear()===y && t.getMonth()===m && t.getDate()===d;
}
function isFuture(y, m, d) {
  const t = new Date(); t.setHours(0,0,0,0);
  return new Date(y, m, d) > t;
}

/* ── Session pill ─────────────────────────────────────────────────────── */
function SessionPill({ type, duration, onRemove }) {
  const cfg = TYPES[type] || TYPES.Other;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl ${cfg.bg}`}>
      <span>{cfg.emoji}</span>
      <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</span>
      {duration ? <span className="text-xs text-slate-500">{duration} min</span> : null}
      {onRemove && (
        <button onClick={onRemove} className="ml-auto text-slate-400 hover:text-rose-500 text-xs font-bold pl-1">✕</button>
      )}
    </div>
  );
}

/* ── Day editor (bottom panel) ───────────────────────────────────────── */
function DayEditor({ year, month, day, sessions, onChange, onClose }) {
  const [addType, setAddType] = useState("Gym");
  const [addDur, setAddDur]   = useState("");

  const dk = dateKey(year, month, day);
  const future = isFuture(year, month, day);
  const dateLabel = new Date(year, month, day).toLocaleDateString(undefined,
    { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  function addSession() {
    onChange([...sessions, { type: addType, duration: addDur ? Number(addDur) : null }]);
    setAddDur("");
  }
  function removeSession(i) { onChange(sessions.filter((_,idx)=>idx!==i)); }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-black text-slate-900">{dateLabel}</div>
          <div className="text-xs text-slate-500 mt-0.5">{sessions.length} session{sessions.length!==1?"s":""} logged</div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">✕</button>
      </div>

      {sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((s,i) => <SessionPill key={i} {...s} onRemove={() => removeSession(i)}/>)}
        </div>
      )}

      <div className="space-y-2">
        {future && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm">📅</span>
            <span className="text-xs text-indigo-500 font-semibold">Planning ahead</span>
          </div>
        )}
        <div className="text-xs font-bold uppercase text-slate-400">Add session</div>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(TYPES).map(([k, cfg]) => (
            <button key={k} onClick={() => setAddType(k)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all ${addType===k ? `${cfg.bg} border-current ${cfg.text}` : "border-transparent bg-slate-50 text-slate-500"}`}>
              <span className="text-xl">{cfg.emoji}</span>
              <span className="text-[10px] font-bold">{cfg.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="number" placeholder="Duration (min)" value={addDur}
            onChange={e=>setAddDur(e.target.value)}
            className="input text-sm py-2 flex-1"/>
          <button onClick={addSession}
            className={`px-4 py-2 rounded-2xl font-bold text-white text-sm bg-gradient-to-r ${TYPES[addType].grad} shadow-md`}>
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Stats strip ──────────────────────────────────────────────────────── */
function StatChip({ label, value, sub, bg, text }) {
  return (
    <div className={`rounded-2xl p-3 flex-1 text-center ${bg}`}>
      <div className={`hero-num text-2xl font-black ${text}`}>{value}</div>
      <div className={`text-[10px] font-bold ${text} opacity-80`}>{label}</div>
      {sub && <div className="text-[9px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ── Type breakdown bar ───────────────────────────────────────────────── */
function TypeBreakdown({ data }) {
  const counts = {};
  Object.values(data).flat().forEach(s => { counts[s.type] = (counts[s.type]||0)+1; });
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  if (!total) return null;
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return (
    <div className="card p-4 space-y-2">
      <div className="font-black text-slate-900 text-sm">All-time breakdown</div>
      {sorted.map(([type, count]) => {
        const cfg = TYPES[type] || TYPES.Other;
        return (
          <div key={type} className="flex items-center gap-2">
            <span className="text-base w-6">{cfg.emoji}</span>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${cfg.dot}`} style={{width:`${(count/total)*100}%`,transition:"width 600ms ease"}}/>
            </div>
            <span className={`text-xs font-bold w-16 text-right ${cfg.text}`}>{count}× ({Math.round((count/total)*100)}%)</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */
export default function Training() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear() < MIN_YEAR ? MIN_YEAR : Math.min(today.getFullYear(), MAX_YEAR));
  const [month, setMonth] = useState(
    today.getFullYear() < MIN_YEAR ? MIN_MONTH :
    today.getFullYear() > MAX_YEAR ? MAX_MONTH : today.getMonth()
  );
  const [selected, setSelected] = useState(null); // day number
  const [data, setData] = useState(() => loadTraining());

  const cells = useMemo(() => calendarDays(year, month), [year, month]);
  const dk = selected !== null ? dateKey(year, month, selected) : null;
  const selectedSessions = dk ? getDay(data, dk) : [];

  const streak = useMemo(() => calcStreak(data), [data]);
  const now = new Date();
  const weekStart = dateKey(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
  const weekEnd   = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const weekCount = countInRange(data, weekStart, weekEnd);
  const monthStart = dateKey(year, month, 1);
  const monthEnd   = dateKey(year, month, new Date(year, month+1, 0).getDate());
  const monthCount = countInRange(data, monthStart, monthEnd);

  function navigate(dir) {
    let [ny, nm] = clampMonth(year, month + dir);
    setYear(ny); setMonth(nm); setSelected(null);
  }

  function updateSessions(sessions) {
    const next = setDay(data, dk, sessions);
    setData(next);
    saveTraining(next);
  }

  const canPrev = !(year===MIN_YEAR && month===MIN_MONTH);
  const canNext = !(year===MAX_YEAR && month===MAX_MONTH);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activity</p>
          <h1 className="text-2xl font-black text-slate-900 mt-0.5">Training Log</h1>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-md">
          <span className="text-xl">⚡</span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex gap-2">
        <StatChip label="Streak" value={`${streak}d`} sub="days in a row" bg="tile-pink" text="text-rose-600"/>
        <StatChip label="This week" value={weekCount} sub="sessions" bg="tile-cal" text="text-amber-600"/>
        <StatChip label="This month" value={monthCount} sub="sessions" bg="tile-fat" text="text-emerald-700"/>
      </div>

      {/* Calendar card */}
      <div className="card p-4 space-y-3">
        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} disabled={!canPrev}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-lg transition ${canPrev ? "bg-slate-100 text-slate-700 active:scale-95" : "text-slate-300"}`}>‹</button>
          <span className="font-black text-slate-900">{MONTH_NAMES[month]} {year}</span>
          <button onClick={() => navigate(1)} disabled={!canNext}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-lg transition ${canNext ? "bg-slate-100 text-slate-700 active:scale-95" : "text-slate-300"}`}>›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`}/>;
            const k = dateKey(year, month, d);
            const sessions = data[k] || [];
            const trained = sessions.length > 0;
            const todayFlag = isToday(year, month, d);
            const futureFlag = isFuture(year, month, d);
            const isSelected = selected === d;

            // Determine dominant type color for dot
            const dominantType = trained ? sessions[0].type : null;
            const dotClass = dominantType ? TYPES[dominantType]?.dot || "bg-slate-400" : "";

            return (
              <button key={k} onClick={() => setSelected(isSelected ? null : d)}
                className={`relative flex flex-col items-center justify-start pt-1 pb-1.5 rounded-2xl transition-all h-12
                  ${isSelected ? "bg-slate-900 scale-105 shadow-lg" : ""}
                  ${todayFlag && !isSelected ? "ring-2 ring-indigo-400 ring-offset-1" : ""}
                  ${futureFlag ? "opacity-60" : "active:scale-95"}
                  ${!isSelected && !todayFlag ? "hover:bg-slate-100" : ""}
                `}>
                <span className={`text-xs font-bold ${isSelected ? "text-white" : todayFlag ? "text-indigo-600" : "text-slate-700"}`}>
                  {d}
                </span>
                {trained && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full px-0.5">
                    {sessions.slice(0,3).map((s,si) => (
                      <div key={si} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : TYPES[s.type]?.dot || "bg-slate-400"}`}/>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-slate-100">
          {Object.entries(TYPES).map(([k,cfg])=>(
            <div key={k} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`}/>
              <span className="text-[9px] text-slate-500 font-semibold">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day editor */}
      {selected !== null && (
        <DayEditor year={year} month={month} day={selected}
          sessions={selectedSessions}
          onChange={updateSessions}
          onClose={() => setSelected(null)}/>
      )}

      {/* All-time type breakdown */}
      <TypeBreakdown data={data}/>
    </div>
  );
}
