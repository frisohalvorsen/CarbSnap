/**
 * Full TDEE + macro calculator.
 *
 * BMR: always Mifflin-St Jeor — sex is always factored in.
 * LBM (from body fat %) is used only for protein targets.
 * TDEE: BMR x activity factor derived from sport type + training days.
 * Calories: TDEE +/- deficit/surplus based on goal + pace.
 * Protein: per kg LBM, scaled by sport type; raised in a deficit to protect muscle.
 * Fat: 25-28% of target calories (floor 0.8 g/kg LBM).
 * Carbs: remaining calories.
 */
export function computeNutritionPlan({
  sex = "male",
  age = 30,
  heightCm = 175,
  weightKg = 75,
  bodyFatPct = 0,
  sportType = "strength",
  trainingDaysPerWeek = 3,
  goal = "build",
  pace = "moderate",
}) {
  const w = Number(weightKg) || 0;
  const h = Number(heightCm) || 175;
  const a = Number(age) || 30;
  const bf = Number(bodyFatPct);
  const days = Number(trainingDaysPerWeek);

  // BMR — Mifflin-St Jeor always, so sex + age + height always affect the result
  const bmr =
    sex === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

  // Lean body mass — used for protein targets only
  const lbm = bf > 3 && bf < 60 ? w * (1 - bf / 100) : w * 0.82;

  // Activity multiplier
  let mult;
  if (sportType === "none") {
    mult = 1.2;
  } else {
    const byDays = [1.2, 1.375, 1.465, 1.55, 1.638, 1.725, 1.812, 1.9];
    mult = byDays[Math.min(7, Math.max(0, days))];
    if (sportType === "strength" && days >= 4) mult = Math.min(mult + 0.05, 1.9);
  }
  const tdee = bmr * mult;

  // Calorie target
  const adjustByPace = {
    lose:    { slow: -200, moderate: -450, fast: -700 },
    build:   { slow: 200,  moderate: 350,  fast: 500  },
    maintain:{ slow: 0,    moderate: 0,    fast: 0    },
  };
  const adjust = adjustByPace[goal]?.[pace] ?? 0;
  const targetCalories = Math.max(1000, Math.round(tdee + adjust));

  // Protein (g per kg LBM, raised in deficit to prevent muscle loss)
  const proteinFactors = {
    none:      { lose: 2.0, maintain: 1.8, build: 1.8 },
    endurance: { lose: 2.2, maintain: 2.0, build: 2.0 },
    strength:  { lose: 2.8, maintain: 2.4, build: 2.6 },
  };
  const pf = proteinFactors[sportType]?.[goal] ?? 2.0;
  const proteinG = Math.round(lbm * pf);
  const proteinKcal = proteinG * 4;

  // Fat (25-28% of target calories, minimum 0.8 g/kg LBM)
  const fatFraction = sportType === "endurance" ? 0.28 : 0.25;
  const fatGComputed = Math.round((targetCalories * fatFraction) / 9);
  const fatGFloor = Math.round(lbm * 0.8);
  const fatG = Math.max(fatGComputed, fatGFloor);
  const realFatKcal = fatG * 9;

  // Carbs — remaining calories
  const carbKcal = Math.max(0, targetCalories - proteinKcal - realFatKcal);
  const carbG = Math.round(carbKcal / 4);

  // Percentages
  const proteinPct = Math.round((proteinKcal / targetCalories) * 100);
  const fatPct = Math.round((realFatKcal / targetCalories) * 100);
  const carbPct = 100 - proteinPct - fatPct;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    proteinG,
    carbG,
    fatG,
    proteinPct,
    carbPct,
    fatPct,
    lbm: Math.round(lbm),
  };
}

export function computeProteinGoal(profile) {
  return computeNutritionPlan(profile).proteinG;
}

/* ── Training-load adjustments ────────────────────────────────────────────
 * Used by Trends to compare a planned week against what was actually done.
 * Per-session kcal = MET × weightKg × (durationMin / 60).
 * Refuel macro split is just guidance for the macro hint string, not a
 * per-day target override — daily targets stay constant.
 */
export const SESSION_MET = {
  Running: 10, HIIT: 8, Boxing: 9, Swim: 7, Gym: 5, Other: 6,
};

const STRENGTH_TYPES = new Set(["Gym"]);
const ENDURANCE_TYPES = new Set(["Running", "HIIT", "Boxing", "Swim"]);

export function computeSessionKcal({ type, durationMin, weightKg }) {
  const met = SESSION_MET[type] ?? 6;
  const w = Number(weightKg) || 0;
  const mins = Number(durationMin) || 0;
  return Math.round(met * w * (mins / 60));
}

/* Map profile sportType -> the equivalent session type used for "planned" */
function plannedSessionType(sportType) {
  if (sportType === "strength") return "Gym";
  if (sportType === "endurance") return "Running";
  return null;
}

/**
 * Aggregate planned vs actual training load for a range of days.
 * sessionsByDay: array of { sessions: [{type, duration}] } in chronological order.
 * Returns weekly-scaled numbers so the card reads naturally for both 7d and 30d.
 */
export function computeWeekAdjustment(profile, sessionsByDay, days) {
  const weeks = days / 7;
  const weightKg = Number(profile?.weightKg) || 0;

  // Actual
  let actualSessions = 0;
  let actualKcal = 0;
  let strengthCount = 0;
  let enduranceCount = 0;
  let strengthMin = 0;
  let enduranceMin = 0;
  for (const day of sessionsByDay) {
    for (const s of day.sessions || []) {
      actualSessions += 1;
      actualKcal += computeSessionKcal({ type: s.type, durationMin: s.duration, weightKg });
      if (STRENGTH_TYPES.has(s.type)) { strengthCount += 1; strengthMin += Number(s.duration) || 0; }
      else if (ENDURANCE_TYPES.has(s.type)) { enduranceCount += 1; enduranceMin += Number(s.duration) || 0; }
    }
  }

  // Planned (assume 60-min sessions of the type matching sportType)
  const plannedType = plannedSessionType(profile?.sportType);
  const plannedPerWeek = Number(profile?.trainingDaysPerWeek) || 0;
  const plannedSessions = Math.round(plannedPerWeek * weeks);
  const plannedKcalPerSession = plannedType
    ? computeSessionKcal({ type: plannedType, durationMin: 60, weightKg })
    : 0;
  const plannedKcal = plannedSessions * plannedKcalPerSession;

  // Static weekly calorie target from existing profile (always-on baseline)
  const dailyTarget = Number(profile?.calorieGoal) || computeNutritionPlan(profile || {}).targetCalories;
  const staticTargetKcal = Math.round(dailyTarget * days);

  // Adjusted target = static (which already assumes planned load) + (actual - planned) burn
  const adjustedTargetKcal = staticTargetKcal + (actualKcal - plannedKcal);

  // One-line macro hint based on the session mix
  let macroHint = null;
  if (actualSessions > 0) {
    if (strengthMin >= enduranceMin * 1.25) {
      macroHint = `Mostly strength this ${days === 7 ? "week" : "period"} — lean toward protein on refuel.`;
    } else if (enduranceMin >= strengthMin * 1.25) {
      macroHint = `Mostly endurance this ${days === 7 ? "week" : "period"} — lean toward carbs on refuel.`;
    } else {
      macroHint = `Mixed strength + endurance — balance protein and carbs.`;
    }
  }

  return {
    days,
    plannedSessions,
    actualSessions,
    plannedKcal,
    actualKcal,
    staticTargetKcal,
    adjustedTargetKcal,
    strengthCount,
    enduranceCount,
    macroHint,
  };
}
