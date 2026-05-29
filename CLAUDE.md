# CarbSnap — Project Brief for Claude

## What this app is
A mobile-friendly PWA for logging food nutrition from photos. The user is diabetic and a gym-goer.
**Carbs and protein must always be the most visually prominent numbers** — this is a hard design rule.

## Stack
- **Frontend**: `client/` — Vite + React + Tailwind CSS v3
- **Backend**: `server/` — Node/Express on port 3001, proxies to Anthropic API
- **Model**: `claude-sonnet-4-6`
- **Storage**: localStorage only (no database)
- **Run dev**: open two terminals:
  1. `cd server && node-v24.16.0-win-x64\node.exe index.js`
  2. `cd client && ..\node-v24.16.0-win-x64\node.exe ..\node-v24.16.0-win-x64\node_modules\npm\bin\npm-cli.js run dev`
- **Node.js**: portable zip at `node-v24.16.0-win-x64/` (company laptop, no admin install)
- **App URL**: http://localhost:5173

## Critical rules
- **NEVER read, display, or access the `.env` file** — the API key is real and must not be exposed in chat.
- The `.env` file lives at the project root and needs `ANTHROPIC_API_KEY=...`
- `dotenv.config({ path: ..., override: true })` is required in server — corporate env vars need `override: true`

## File structure (key files)
```
CarbSnap/
  .env                          ← API key lives here — never read this
  node-v24.16.0-win-x64/        ← portable Node.js
  server/
    index.js                    ← Express server, /api/analyze, /api/health
  client/
    public/
      manifest.json             ← PWA manifest
      sw.js                     ← Service worker
    src/
      App.jsx                   ← 5-tab router + background blobs
      index.css                 ← pastel tile classes, blob animations, base styles
      lib/
        storage.js              ← loadEntries, saveEntry, deleteEntry, loadProfile, saveProfile
        training.js             ← loadTraining, saveTraining, dateKey, calcStreak, etc.
        nutrition.js            ← TDEE + macro calculator (Mifflin-St Jeor always)
      components/
        TabBar.jsx              ← 5-tab floating pill nav (custom SVG icons)
        MealCard.jsx            ← Single meal entry card
        BarChart.jsx            ← DualBarChart (carbs + protein bars)
        LineChart.jsx           ← Smooth bezier line chart
        ProteinRing.jsx         ← Circular progress ring
      pages/
        Capture.jsx             ← Photo → AI analysis → nutrition result
        Today.jsx               ← Daily dashboard (2×2 tiles, protein ring, training card)
        Overview.jsx            ← Trends: charts + training vs rest day comparison
        Training.jsx            ← Training log calendar (Jan 2026–Dec 2027)
        Profile.jsx             ← TDEE calculator + macro targets
```

## localStorage keys
- `carbsnap.entries.v1` — meal entries array
- `carbsnap.profile.v2` — user profile + computed goals
- `carbsnap.training.v1` — training log `{ "YYYY-MM-DD": [{type, duration}] }`

## Profile fields (carbsnap.profile.v2)
```js
{
  sex, age, heightCm, weightKg, bodyFatPct,
  sportType,           // "non-sport" | "endurance" | "strength"
  trainingDaysPerWeek, // 0–7
  goal,                // "lose" | "build" | "maintain"
  pace,                // "slow" | "moderate" | "fast"
  proteinGoal: 144,    // grams, computed by nutrition.js
  calorieGoal: 2400    // kcal, computed by nutrition.js
}
```

## Nutrition calculator (nutrition.js)
- Always uses **Mifflin-St Jeor** for BMR (sex always affects output — this was a deliberate fix)
- LBM-based protein targets (from body fat %)
- `computeNutritionPlan({sex, age, heightCm, weightKg, bodyFatPct, sportType, trainingDaysPerWeek, goal, pace})`
- Returns: `{bmr, tdee, targetCalories, proteinG, carbG, fatG, proteinPct, carbPct, fatPct, lbm}`

## Training module (training.js)
- Date range: **Jan 2026 – Dec 2027** (`MIN_YEAR=2026`, `MAX_YEAR=2027`)
- Future days can be logged (planning ahead) — they show at opacity-60 but are fully interactive
- Session types: HIIT, Boxing, Running, Gym, Swim, Other
- `calcStreak(data)` — consecutive days with at least one session up to today
- `countInRange(data, startKey, endKey)` — count active days in a range
- `calendarDays(year, month)` — returns array with null padding for Mon-start grid

## Design system
- Background: `#eef2f7`, no white full-screen
- Pastel tile classes in index.css: `.tile-carb` (orange), `.tile-protein` (indigo), `.tile-cal` (amber), `.tile-fat` (emerald), `.tile-blue`, `.tile-pink`
- `.card` = white rounded-3xl with shadow
- `.hero-num` = large numeric display font
- `.input` = styled text input
- `.pill` = small rounded badge
- Background blobs: `.blob` and `.blob-2` (organic border-radius, animated float)
- Health/fitness aesthetic: vibrant gradients, pastel fills, SVG illustrations

## Tab bar
5 tabs with custom SVG icons, floating white pill design with backdrop blur:
| Tab ID | Label | Color | Icon |
|--------|-------|-------|------|
| capture | Snap | orange | Camera (rect body + circle lens + bump) |
| today | Today | indigo | Calendar (rect + lines + filled dot) |
| overview | Trends | emerald | Bar chart (3 rising bars) |
| training | Train | rose | Dumbbell (line-based) |
| profile | Me | violet | Person (circle head + shoulder arc) |

## Server (server/index.js)
- `POST /api/analyze` — accepts `{imageBase64, mimeType}`, sends to Claude vision, returns parsed nutrition JSON
- `GET /api/health` — returns `{ok: true, hasKey: true/false}`
- Strips ```json fences before `JSON.parse`
- CORS enabled for localhost:5173

## Capture flow
1. User picks/takes photo
2. Client resizes to max 1024px, JPEG quality ~0.7
3. POST to `/api/analyze` with base64
4. Claude returns JSON with `{foodName, carbs, protein, calories, fat, sugar, fiber, portionG, confidence, notes}`
5. User can scale portion (×0.5, ×0.75, ×1, ×1.5, ×2)
6. Save button stores to localStorage and navigates to Today tab

## Things deliberately removed
- All diabetes/insulin disclaimers
- API key setup instructions (from all pages)
- Any onboarding guidance about the app being experimental

## Known fixes applied (don't revert these)
- `dotenv override: true` in server — needed for corporate machines
- BMR always uses Mifflin-St Jeor (not Katch-McArdle) — sex must affect calories
- Training calendar starts Mon (not Sun) — `calendarDays` pads with Mon offset
- Future training days allowed — `!future &&` guard was removed from DayEditor

---

## Project history & current status (as of 2026-05-29)

### What was built (in order)
1. **Project setup** — Vite+React client, Express server, Tailwind, PWA manifest + service worker. Portable Node.js zip used because user cannot install software on company laptop.
2. **Capture page** — photo picker + camera, client-side resize, POST to Express backend, Claude vision analysis, portion scaling (×0.5–×2), save to localStorage.
3. **Today page** — daily nutrition dashboard: 2×2 metric tiles (carbs/protein/calories/fat) with inline SVG illustrations, protein ring progress chart, daily score card, training status card.
4. **Overview (Trends) page** — weekly/monthly bar chart and line chart, average macros, training emoji markers under chart, training-day vs rest-day nutrition comparison.
5. **Profile & Goal page** — full TDEE calculator (sex/age/height/weight/body fat/sport type/training days/goal/pace), computed protein + calorie targets, macro breakdown pie chart.
6. **Training Log page** — monthly calendar Jan 2026–Dec 2027, tap any day to log sessions (HIIT/Boxing/Running/Gym/Swim/Other + duration), streak counter, weekly/monthly session counts, all-time type breakdown bars. Future days can be planned.
7. **Cross-tab integration** — Training data flows into Today (training card shows today's sessions + remaining protein) and Overview (training markers on chart, train vs rest comparison).
8. **Design overhaul** — health-app aesthetic: pastel tiles, gradient hero cards, SVG illustrations, background blobs, hero numbers. Cleaned up all disclaimer/API-key text.
9. **Tab icons** — multiple iterations to get recognizable custom SVG icons for all 5 tabs.

### Where things stand
- The app is **fully functional end-to-end**: photo → AI analysis → nutrition logging → dashboard → trends → training log → profile/goals.
- Everything runs locally: `node server/index.js` + `npm run dev` in client.
- The API key is in `.env` at the project root — the user rotated it once after it was accidentally exposed; never read that file.
- No known bugs at the end of the last session.

### What could come next (user hasn't asked yet)
- Fine-tuning any remaining UI details
- Barcode scanning as an alternative to photo
- Export / data backup feature
- Notifications or reminders
