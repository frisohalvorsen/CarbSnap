const ENTRIES_KEY = "carbsnap.entries.v1";
const PROFILE_KEY = "carbsnap.profile.v2";

const DEFAULT_PROFILE = {
  sex: "male", age: 30, heightCm: 175, weightKg: 80, bodyFatPct: 15,
  sportType: "strength", trainingDaysPerWeek: 4, goal: "build", pace: "moderate",
  proteinGoal: 144, calorieGoal: 2400,
};

export function loadEntries() {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function addEntry(entry) {
  const all = loadEntries();
  all.unshift(entry);
  saveEntries(all);
  return all;
}

export function deleteEntry(id) {
  const all = loadEntries().filter((e) => e.id !== id);
  saveEntries(all);
  return all;
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw
      ? JSON.parse(raw)
      : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameDay(a, b) {
  return startOfDay(a) === startOfDay(b);
}
