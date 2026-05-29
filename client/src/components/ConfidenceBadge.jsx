export default function ConfidenceBadge({ value }) {
  const map = {
    low: "bg-rose-100 text-rose-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-emerald-100 text-emerald-700",
  };
  const cls = map[value] || map.medium;
  return (
    <span className={`pill ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {value} confidence
    </span>
  );
}
