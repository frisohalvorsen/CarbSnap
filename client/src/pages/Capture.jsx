import { useRef, useState, useMemo } from "react";
import { fileToCompressedJpeg } from "../lib/image.js";
import { addEntry, newId } from "../lib/storage.js";
import { authHeader } from "../lib/auth.js";
import { MacroHero, SecondaryMacros } from "../components/NutritionCards.jsx";
import ConfidenceBadge from "../components/ConfidenceBadge.jsx";

/* ── Date helpers ─────────────────────────────────────────────────────── */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateStrToTimestamp(str) {
  // Use noon to avoid any timezone edge cases
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}
function saveBtnLabel(dateStr) {
  if (dateStr === todayStr())     return "Save to today →";
  if (dateStr === yesterdayStr()) return "Save to yesterday →";
  const d = new Date(dateStr + "T12:00:00");
  return `Save to ${d.toLocaleDateString(undefined, { weekday:"short", day:"numeric", month:"short" })} →`;
}

/* ── DateChooser component ────────────────────────────────────────────── */
function DateChooser({ value, onChange }) {
  const tStr = todayStr();
  const yStr = yesterdayStr();
  const isToday     = value === tStr;
  const isYesterday = value === yStr;
  const isEarlier   = !isToday && !isYesterday;

  const chip = (label, active, onClick) => (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
        active
          ? "bg-slate-900 text-white shadow"
          : "bg-white text-slate-500 border border-slate-200"
      }`}>
      {label}
    </button>
  );

  return (
    <div className="bg-slate-50 rounded-2xl px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log for</span>
        <div className="flex gap-1.5">
          {chip("Today",     isToday,     () => onChange(tStr))}
          {chip("Yesterday", isYesterday, () => onChange(yStr))}
          {chip("Earlier…",  isEarlier,   () => { if (!isEarlier) onChange(yStr); })}
        </div>
      </div>
      {isEarlier && (
        <input
          type="date"
          max={yStr}
          value={value}
          onChange={e => e.target.value && onChange(e.target.value)}
          className="input py-2 text-sm w-full"
        />
      )}
    </div>
  );
}

/* ── Main Capture component ───────────────────────────────────────────── */
export default function Capture({ onSaved, onAuthFail }) {
  const fileRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageThumb, setImageThumb]     = useState(null);
  const [imageBase64, setImageBase64]   = useState(null);
  const [mediaType, setMediaType]       = useState("image/jpeg");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [result, setResult]             = useState(null);
  const [scale, setScale]               = useState(1);
  const [editedName, setEditedName]     = useState("");
  const [showManual, setShowManual]     = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setResult(null); setSelectedDate(todayStr());
    try {
      const { base64, mediaType, dataUrl, thumbDataUrl } = await fileToCompressedJpeg(file);
      setImagePreview(dataUrl); setImageThumb(thumbDataUrl);
      setImageBase64(base64); setMediaType(mediaType);
      await analyze(base64, mediaType, null);
    } catch (err) { setError("Could not read image: " + err.message); }
  }

  async function analyze(b64, mt, hint) {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ imageBase64: b64, mediaType: mt, hintFoodName: hint }),
      });
      const data = await r.json();
      if (r.status === 401) { onAuthFail?.(); return; }
      if (!r.ok) { setError(data.error || "Analyze failed"); return; }
      setResult(data); setEditedName(data.foodName); setScale(1);
    } catch (err) { setError("Network error: " + err.message); }
    finally { setLoading(false); }
  }

  const scaled = useMemo(() => {
    if (!result) return null;
    const s = scale;
    return {
      ...result,
      portionGrams: Math.round(result.portionGrams * s),
      carbs:    result.carbs    * s,
      calories: result.calories * s,
      protein:  result.protein  * s,
      fat:      result.fat      * s,
      sugar:    result.sugar    * s,
      fiber:    result.fiber    * s,
    };
  }, [result, scale]);

  function save() {
    if (!scaled) return;
    addEntry({
      id: newId(),
      timestamp: dateStrToTimestamp(selectedDate),
      imageThumbnail: imageThumb,
      foodName: editedName || scaled.foodName,
      portionGrams: scaled.portionGrams, portionLabel: scaled.portionLabel,
      carbs: round(scaled.carbs), calories: round(scaled.calories),
      protein: round(scaled.protein), fat: round(scaled.fat),
      sugar: round(scaled.sugar), fiber: round(scaled.fiber),
      confidence: scaled.confidence,
    });
    setResult(null); setImagePreview(null); setImageThumb(null);
    setImageBase64(null); setScale(1); setSelectedDate(todayStr());
    onSaved?.();
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">CarbSnap 📸</h1>
          <p className="text-sm text-slate-500 mt-0.5">Snap your plate, track your macros</p>
        </div>
      </div>

      {!imagePreview && !showManual && (
        <WelcomeCard onCapture={() => fileRef.current?.click()} onManual={() => setShowManual(true)} />
      )}

      {showManual && (
        <ManualEntry
          onSave={(e) => { addEntry(e); setShowManual(false); onSaved?.(); }}
          onCancel={() => setShowManual(false)}
          onAuthFail={onAuthFail}
        />
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} className="hidden" />

      {imagePreview && (
        <div className="rounded-3xl overflow-hidden shadow-xl">
          <img src={imagePreview} alt="" className="w-full h-64 object-cover" />
        </div>
      )}

      {loading && (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3 animate-bounce">🤖</div>
          <div className="font-black text-slate-800 text-lg">Analysing…</div>
          <div className="text-sm text-slate-500 mt-1">Claude is estimating your meal</div>
          <div className="mt-4 flex justify-center gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
                style={{ animationDelay: `${i*0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      {scaled && !loading && (
        <div className="space-y-3">
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <input value={editedName} onChange={(e) => setEditedName(e.target.value)}
                className="input font-black text-lg flex-1" />
              <ConfidenceBadge value={scaled.confidence} />
            </div>
            <MacroHero carbs={scaled.carbs} protein={scaled.protein} />
            <SecondaryMacros calories={scaled.calories} fat={scaled.fat}
              sugar={scaled.sugar} fiber={scaled.fiber} />

            {/* Portion slider */}
            <div className="pastel-cal rounded-2xl p-3 space-y-2">
              <div className="flex justify-between text-xs font-bold text-amber-700">
                <span>Portion size</span>
                <span>{scaled.portionGrams} g · {scaled.portionLabel}</span>
              </div>
              <input type="range" min="0.25" max="3" step="0.05" value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-amber-500" />
              <div className="relative h-4 text-[10px] text-amber-600/60 font-semibold">
                <span className="absolute left-0">¼ ×</span>
                <span className="absolute" style={{left:"27.3%",transform:"translateX(-50%)"}}>1 ×</span>
                <span className="absolute right-0">3 ×</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-amber-700">Grams:</label>
                <input type="number" value={scaled.portionGrams}
                  onChange={(e) => {
                    const g = Number(e.target.value);
                    if (g > 0 && result?.portionGrams > 0) setScale(g / result.portionGrams);
                  }}
                  className="input py-2 w-28 text-sm" />
              </div>
            </div>

            {/* Date chooser */}
            <DateChooser value={selectedDate} onChange={setSelectedDate} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => analyze(imageBase64, mediaType, editedName)} disabled={loading}>
              🔄 Re-analyse
            </button>
            <button className="btn-primary" onClick={save}>
              {saveBtnLabel(selectedDate)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── WelcomeCard ──────────────────────────────────────────────────────── */
function WelcomeCard({ onCapture, onManual }) {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl overflow-hidden relative" style={{background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)"}}>
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/10 blur-2xl"/>
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 blur-xl"/>
        <div className="relative z-10 p-6">
          <p className="text-white/70 text-sm font-semibold">AI-powered</p>
          <h2 className="text-white font-black text-2xl mt-0.5 leading-tight">Snap it.<br/>Track it.</h2>
          <p className="text-white/70 text-sm mt-2">Photo → Claude AI → carbs & protein in seconds</p>
          <div className="flex gap-3 mt-5 text-4xl">
            <span className="bg-white/20 rounded-2xl w-14 h-14 flex items-center justify-center">🥗</span>
            <span className="bg-white/20 rounded-2xl w-14 h-14 flex items-center justify-center">🍗</span>
            <span className="bg-white/20 rounded-2xl w-14 h-14 flex items-center justify-center">🍚</span>
            <span className="bg-white/20 rounded-2xl w-14 h-14 flex items-center justify-center">🥩</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[["🌾","Carbs","tile-carb","text-orange-600"],["💪","Protein","tile-protein","text-indigo-600"],
          ["🔥","Calories","tile-cal","text-amber-600"],["🥑","Fat","tile-fat","text-emerald-700"]].map(([e,l,bg,c])=>(
          <div key={l} className={`${bg} rounded-2xl p-2 text-center`}>
            <div className="text-xl">{e}</div>
            <div className={`text-[10px] font-bold ${c}`}>{l}</div>
          </div>
        ))}
      </div>
      <button className="btn-primary w-full py-4 text-base rounded-2xl" onClick={onCapture}>
        📷  Take or choose a photo
      </button>
      <button className="btn-ghost w-full rounded-2xl" onClick={onManual}>
        ✏️  Enter manually
      </button>
    </div>
  );
}

/* ── ManualEntry ──────────────────────────────────────────────────────── */
function ManualEntry({ onSave, onCancel, onAuthFail }) {
  const [step, setStep]             = useState("input");
  const [foodName, setFoodName]     = useState("");
  const [result, setResult]         = useState(null);
  const [scale, setScale]           = useState(1);
  const [editedName, setEditedName] = useState("");
  const [error, setError]           = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const scaled = useMemo(() => {
    if (!result) return null;
    return {
      ...result,
      portionGrams: Math.round(result.portionGrams * scale),
      carbs:    result.carbs    * scale,
      calories: result.calories * scale,
      protein:  result.protein  * scale,
      fat:      result.fat      * scale,
      sugar:    result.sugar    * scale,
      fiber:    result.fiber    * scale,
    };
  }, [result, scale]);

  async function lookup() {
    if (!foodName.trim()) return;
    setStep("loading"); setError("");
    try {
      const r = await fetch("/api/lookup", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ foodName: foodName.trim() }),
      });
      const data = await r.json();
      if (r.status === 401) { onAuthFail?.(); return; }
      if (!r.ok) { setError(data.error || "Lookup failed"); setStep("input"); return; }
      setResult(data); setEditedName(data.foodName); setScale(1); setStep("result");
    } catch (err) { setError("Network error: " + err.message); setStep("input"); }
  }

  if (step === "loading") return (
    <div className="card p-8 text-center">
      <div className="text-4xl mb-3 animate-bounce">🤖</div>
      <div className="font-black text-slate-800 text-lg">Looking up…</div>
      <div className="text-sm text-slate-500 mt-1">Claude is fetching nutrition data</div>
      <div className="mt-4 flex justify-center gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
            style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
    </div>
  );

  if (step === "result" && scaled) return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <input value={editedName} onChange={e => setEditedName(e.target.value)}
          className="input font-black text-lg flex-1" />
        <ConfidenceBadge value={scaled.confidence} />
      </div>

      <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3 py-2">
        <span className="text-sm">📏</span>
        <span className="text-xs text-slate-500">
          <span className="font-bold text-slate-700">1 serving</span> = {result.portionLabel}
        </span>
      </div>

      <MacroHero carbs={scaled.carbs} protein={scaled.protein} />
      <SecondaryMacros calories={scaled.calories} fat={scaled.fat}
        sugar={scaled.sugar} fiber={scaled.fiber} />

      {/* Portion adjuster */}
      <div className="pastel-cal rounded-2xl p-3 space-y-2">
        <div className="flex justify-between text-xs font-bold text-amber-700">
          <span>Portion size</span>
          <span>{scaled.portionGrams}g · {scale.toFixed(2).replace(/\.?0+$/, "")}× serving</span>
        </div>
        <input type="range" min="0.25" max="3" step="0.05" value={scale}
          onChange={e => setScale(Number(e.target.value))}
          className="w-full accent-amber-500" />
        <div className="relative h-4 text-[10px] text-amber-600/60 font-semibold">
          <span className="absolute left-0">¼ ×</span>
          <span className="absolute" style={{left:"27.3%",transform:"translateX(-50%)"}}>1 ×</span>
          <span className="absolute right-0">3 ×</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-amber-700">Grams:</label>
          <input type="number" value={scaled.portionGrams}
            onChange={e => {
              const g = Number(e.target.value);
              if (g > 0 && result?.portionGrams > 0) setScale(g / result.portionGrams);
            }}
            className="input py-2 w-28 text-sm" />
        </div>
      </div>

      {/* Date chooser */}
      <DateChooser value={selectedDate} onChange={setSelectedDate} />

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={() => setStep("input")}>← Back</button>
        <button className="btn-primary" onClick={() => onSave({
          id: newId(),
          timestamp: dateStrToTimestamp(selectedDate),
          imageThumbnail: null,
          foodName: editedName || scaled.foodName,
          portionGrams: scaled.portionGrams, portionLabel: scaled.portionLabel,
          carbs: round(scaled.carbs), calories: round(scaled.calories),
          protein: round(scaled.protein), fat: round(scaled.fat),
          sugar: round(scaled.sugar), fiber: round(scaled.fiber),
          confidence: scaled.confidence,
        })}>
          {saveBtnLabel(selectedDate)}
        </button>
      </div>
    </div>
  );

  // step === "input"
  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-black text-slate-900 text-lg">✏️ Add food manually</h2>
      {error && (
        <div className="rounded-xl p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Food name</label>
        <input className="input text-base" placeholder="e.g. chicken breast, banana, pasta…"
          value={foodName} onChange={e => setFoodName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && lookup()} autoFocus />
        <p className="text-xs text-slate-400 pt-1">
          Claude looks up a standard serving — you adjust the portion after.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={!foodName.trim()} onClick={lookup}>
          🔍 Look up
        </button>
      </div>
    </div>
  );
}

function round(n) { return Math.round(Number(n || 0) * 10) / 10; }
