const KEY = "carbsnap.training.v1";

export function loadTraining() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export function saveTraining(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function dateKey(year, month, day) {
  return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

export function todayKey() {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function keyToDate(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* Returns sessions array for a date key, or [] */
export function getDay(data, key) { return data[key] || []; }

export function setDay(data, key, sessions) {
  const next = { ...data };
  if (!sessions || sessions.length === 0) delete next[key];
  else next[key] = sessions;
  return next;
}

/* Count sessions in a date range [startKey, endKey] inclusive */
export function countInRange(data, startKey, endKey) {
  return Object.keys(data)
    .filter(k => k >= startKey && k <= endKey)
    .reduce((s, k) => s + (data[k]?.length || 0), 0);
}

/* Training streak: consecutive days with at least one session ending today/yesterday */
export function calcStreak(data) {
  const today = new Date(); today.setHours(0,0,0,0);
  let streak = 0, cursor = new Date(today);
  while (true) {
    const k = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (!data[k]?.length) {
      if (streak === 0 && cursor.getTime() === today.getTime()) {
        cursor.setDate(cursor.getDate() - 1); continue;
      }
      break;
    }
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* Calendar helpers */
export const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

export const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export function calendarDays(year, month) {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7; // shift to Mon-start
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return cells;
}

/* Min/max selectable months: Jan 2026 – Dec 2027 */
export const MIN_YEAR = 2026; export const MIN_MONTH = 0;
export const MAX_YEAR = 2027; export const MAX_MONTH = 11;
