const c = (on, active, inactive = "#94a3b8") => on ? active : inactive;

const TABS = [
  {
    id: "capture", label: "Snap",
    text: "text-orange-500", bg: "bg-orange-50",
    icon: (on) => (
      /* Camera: rounded body + circle lens + bump */
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
        className="w-6 h-6">
        <rect x="2" y="8" width="20" height="13" rx="2.5"
          fill={on ? "#ffedd5" : "none"} stroke={c(on,"#f97316")} strokeWidth="1.8"/>
        <path d="M8 8 L9.5 5 H14.5 L16 8" stroke={c(on,"#f97316")} strokeWidth="1.8" fill="none"/>
        <circle cx="12" cy="14.5" r="3.5"
          fill={on ? "#f97316" : "none"} stroke={c(on,"#f97316")} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    id: "today", label: "Today",
    text: "text-indigo-500", bg: "bg-indigo-50",
    icon: (on) => (
      /* Calendar with a filled dot marking "today" */
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
        className="w-6 h-6">
        <rect x="3" y="4" width="18" height="17" rx="2.5"
          fill={on ? "#e0e7ff" : "none"} stroke={c(on,"#6366f1")} strokeWidth="1.8"/>
        <line x1="8"  y1="2" x2="8"  y2="6" stroke={c(on,"#6366f1")} strokeWidth="1.8"/>
        <line x1="16" y1="2" x2="16" y2="6" stroke={c(on,"#6366f1")} strokeWidth="1.8"/>
        <line x1="3"  y1="10" x2="21" y2="10" stroke={c(on,"#6366f1")} strokeWidth="1.8"/>
        <circle cx="12" cy="16" r="2.5" fill={c(on,"#6366f1")} stroke="none"/>
      </svg>
    ),
  },
  {
    id: "overview", label: "Trends",
    text: "text-emerald-500", bg: "bg-emerald-50",
    icon: (on) => (
      /* Three rising bars */
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
        className="w-6 h-6">
        <rect x="3"  y="14" width="4.5" height="7" rx="1.2"
          fill={on ? "#bbf7d0" : "none"} stroke={c(on,"#10b981")} strokeWidth="1.8"/>
        <rect x="9.75" y="9" width="4.5" height="12" rx="1.2"
          fill={on ? "#6ee7b7" : "none"} stroke={c(on,"#10b981")} strokeWidth="1.8"/>
        <rect x="16.5" y="4" width="4.5" height="17" rx="1.2"
          fill={on ? "#34d399" : "none"} stroke={c(on,"#10b981")} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    id: "training", label: "Train",
    text: "text-rose-500", bg: "bg-rose-50",
    icon: (on) => (
      /* Dumbbell: two outer plates (thick) + two collars (medium) + bar (thin) */
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round"
        className="w-6 h-6">
        <line x1="3"   y1="8"  x2="3"   y2="16" strokeWidth="3.5" stroke={c(on,"#f43f5e")}/>
        <line x1="6.5" y1="9.5" x2="6.5" y2="14.5" strokeWidth="2.5" stroke={c(on,"#f43f5e")}/>
        <line x1="6.5" y1="12" x2="17.5" y2="12" strokeWidth="2"   stroke={c(on,"#f43f5e")}/>
        <line x1="17.5" y1="9.5" x2="17.5" y2="14.5" strokeWidth="2.5" stroke={c(on,"#f43f5e")}/>
        <line x1="21"  y1="8"  x2="21"  y2="16" strokeWidth="3.5" stroke={c(on,"#f43f5e")}/>
      </svg>
    ),
  },
  {
    id: "profile", label: "Me",
    text: "text-violet-500", bg: "bg-violet-50",
    icon: (on) => (
      /* Person: circle head + open arc for shoulders */
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
        className="w-6 h-6">
        <circle cx="12" cy="8" r="4"
          fill={on ? "#ddd6fe" : "none"} stroke={c(on,"#8b5cf6")} strokeWidth="1.8"/>
        <path d="M5 20 C5 16.1 8.1 13 12 13 C15.9 13 19 16.1 19 20"
          fill={on ? "#ede9fe" : "none"} stroke={c(on,"#8b5cf6")} strokeWidth="1.8"/>
      </svg>
    ),
  },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 px-4 pb-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="max-w-md mx-auto">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-300/50 border border-white px-1 py-1.5 flex items-center">
          {TABS.map(t => {
            const on = active === t.id;
            return (
              <button key={t.id} onClick={() => onChange(t.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-1 transition-all duration-200">
                <div className={`w-11 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 ${on ? t.bg : ""}`}>
                  {t.icon(on)}
                </div>
                <span className={`text-[10px] font-bold tracking-wide transition-colors ${on ? t.text : "text-slate-400"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
