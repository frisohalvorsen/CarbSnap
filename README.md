# CarbSnap

Snap a photo of your food → CarbSnap estimates **carbs** and **protein** (and the rest).

Built for people who actually care about those two numbers — diabetics tracking carbs and lifters chasing a protein target. Mobile-first, installable as a PWA.

## Stack
- **Frontend:** Vite + React + Tailwind CSS
- **Backend:** minimal Node/Express proxy (one endpoint: `POST /api/analyze`)
- **AI:** Anthropic Claude (`claude-sonnet-4-6`) via vision
- **Storage:** browser `localStorage` only — no database, no signup

## Setup

### 1. Get an Anthropic API key
1. Sign in at https://console.anthropic.com
2. Open **API Keys** → **Create Key**
3. Copy the `sk-ant-...` value (you won't see it again)

### 2. Put the key in `.env`
At the project root, edit `.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxx
```
`.env` is gitignored — your key never leaves your machine and is never bundled into the frontend.

### 3. Install
```
npm run install:all
```
(Installs root, server, and client dependencies.)

### 4. Run
```
npm run dev
```
This starts:
- Backend on **http://localhost:3001** (proxies to Anthropic)
- Frontend on **http://localhost:5173** (Vite dev server, proxies `/api` to the backend)

Open http://localhost:5173 on your phone (same Wi-Fi as your laptop) and "Add to Home Screen" to install as a PWA.

### Backend-only command
```
npm run dev:server
```
### Frontend-only command
```
npm run dev:client
```

## How the analyze flow works
1. You take/upload a photo.
2. The client resizes to max 1024px and JPEG-compresses (~0.7) to save tokens.
3. Sends base64 JPEG to `POST /api/analyze`.
4. The server calls Claude with a strict JSON system prompt.
5. Returns `{foodName, portionLabel, portionGrams, carbs, calories, protein, fat, sugar, fiber, confidence}`.
6. You adjust the portion (slider or grams) — all values rescale live.
7. "Save to today" stores the entry in localStorage.

## Pages
- **Capture** — photo → analyze → adjust → save. Manual entry also available.
- **Today** — meals with carbs & protein as hero numbers, daily totals, protein progress ring.
- **Overview** — week / month bar charts of daily carbs & protein, averages, trend, tap a day for its meals.
- **Profile & Goal** — protein calculator (weight × factor) drives the Today ring goal.

## Protein goal formulas
- **Maintain:** `weight × 1.5 g/kg`
- **Build muscle:** `weight × 1.8 g/kg` (2.2 if training 5+ days/week)
- **Get lean:** `weight × 2.2 g/kg`

## Disclaimer
Nutrition values are **AI estimates** and **should not be used for insulin dosing**. The protein target is general guidance, not medical advice.
