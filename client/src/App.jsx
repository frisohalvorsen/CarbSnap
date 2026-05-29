import { useState } from "react";
import TabBar from "./components/TabBar.jsx";
import Capture from "./pages/Capture.jsx";
import Today from "./pages/Today.jsx";
import Overview from "./pages/Overview.jsx";
import Training from "./pages/Training.jsx";
import Profile from "./pages/Profile.jsx";
import { getAccessCode, setAccessCode, clearAccessCode, authHeader } from "./lib/auth.js";

function Blobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden>
      <div className="absolute -top-48 -right-48 w-96 h-96 blob bg-blue-200/40 blur-3xl" />
      <div className="absolute top-1/2 -left-32 w-80 h-80 blob-2 bg-indigo-200/30 blur-3xl" />
      <div className="absolute -bottom-32 right-10 w-72 h-72 blob bg-pink-200/30 blur-3xl" />
    </div>
  );
}

function LockScreen({ onUnlock }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function attempt() {
    if (!code.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/health", {
        headers: { ...authHeader(), "x-access-code": code.trim() },
      });
      if (r.ok) {
        setAccessCode(code.trim());
        onUnlock();
      } else {
        setError("Wrong code. Try again.");
      }
    } catch {
      setError("Could not connect to server.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-6">
      <Blobs />
      <img src="/icon.svg" alt="CarbSnap" className="w-24 h-24 rounded-3xl shadow-xl" />
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-black text-slate-900">CarbSnap</h1>
        <p className="text-sm text-slate-500">Enter your access code to continue</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <input
          className="input text-center text-xl font-bold tracking-widest"
          type="password"
          placeholder="••••••"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
          autoFocus
        />
        {error && (
          <p className="text-rose-500 text-sm text-center font-semibold">{error}</p>
        )}
        <button
          className="btn-primary w-full py-3"
          disabled={!code.trim() || loading}
          onClick={attempt}
        >
          {loading ? "Checking…" : "Unlock →"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => !!getAccessCode());
  const [tab, setTab] = useState("capture");
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey(k => k + 1);

  function handleAuthFail() {
    clearAccessCode();
    setUnlocked(false);
  }

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen text-slate-900">
      <Blobs />
      <div className="max-w-md mx-auto pb-32">
        {tab === "capture"  && <Capture onSaved={() => { bump(); setTab("today"); }} onAuthFail={handleAuthFail} />}
        {tab === "today"    && <Today refreshKey={refreshKey} onChange={bump} />}
        {tab === "overview" && <Overview refreshKey={refreshKey} />}
        {tab === "training" && <Training />}
        {tab === "profile"  && <Profile onChange={bump} />}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
