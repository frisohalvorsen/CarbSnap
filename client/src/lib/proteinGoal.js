export function computeProteinGoal({ weightKg, trainingDaysPerWeek, goal }) {
  const w = Number(weightKg) || 0;
  let factor;
  switch (goal) {
    case "maintain":
      factor = 1.5;
      break;
    case "lean":
      factor = 2.2;
      break;
    case "build":
    default:
      factor = trainingDaysPerWeek >= 5 ? 2.2 : 1.8;
      break;
  }
  return Math.round(w * factor);
}
