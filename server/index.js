import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

const PORT = process.env.PORT || 3001;
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a nutrition analyst. Given a photo of food, estimate:
- foodName: a short descriptive name
- portionLabel: a human-readable portion description (e.g. "1 medium bowl", "~250 g serving")
- portionGrams: estimated total grams of the visible food
- nutrition for that visible portion: carbs, calories, protein, fat, sugar, fiber (grams, except calories in kcal)
- confidence: "low" | "medium" | "high"

You MUST respond with ONLY a single valid JSON object, no prose, no markdown fences. Shape:
{"foodName": string, "portionLabel": string, "portionGrams": number, "carbs": number, "calories": number, "protein": number, "fat": number, "sugar": number, "fiber": number, "confidence": "low"|"medium"|"high"}

All numeric values must be numbers (not strings). Round to 1 decimal. If a value is unknown, estimate based on typical values for the food; never return null.`;

function stripFences(text) {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasKey: !!process.env.ANTHROPIC_API_KEY });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { imageBase64, mediaType = "image/jpeg", hintFoodName } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "Missing imageBase64" });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Server missing ANTHROPIC_API_KEY in .env" });
    }

    const userText = hintFoodName
      ? `The user says this food is: "${hintFoodName}". Use that as the food identity and estimate nutrition for the visible portion. Return JSON only.`
      : `Analyze the visible food and return JSON only.`;

    const body = {
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: userText },
          ],
        },
      ],
    };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("Anthropic API error:", r.status, errText);
      return res.status(502).json({ error: "Anthropic API error", status: r.status, detail: errText });
    }

    const data = await r.json();
    const text = data?.content?.[0]?.text ?? "";
    const cleaned = stripFences(text);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse failed. Raw:", text);
      return res.status(502).json({ error: "Model did not return valid JSON", raw: text });
    }

    const numKeys = ["portionGrams", "carbs", "calories", "protein", "fat", "sugar", "fiber"];
    for (const k of numKeys) {
      const n = Number(parsed[k]);
      parsed[k] = Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
    }
    if (!["low", "medium", "high"].includes(parsed.confidence)) parsed.confidence = "medium";
    parsed.foodName = String(parsed.foodName ?? "Unknown food");
    parsed.portionLabel = String(parsed.portionLabel ?? `${parsed.portionGrams} g`);

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err?.message || err) });
  }
});

const LOOKUP_PROMPT = `You are a nutrition database. Given a food name, return nutritional values for one standard serving of that food.

Respond with ONLY a single valid JSON object, no prose, no markdown fences. Shape:
{"foodName": string, "portionLabel": string, "portionGrams": number, "carbs": number, "calories": number, "protein": number, "fat": number, "sugar": number, "fiber": number, "confidence": "low"|"medium"|"high"}

portionLabel: describe one realistic adult meal portion, e.g. "1 adult plate of pasta (350g)", "1 full chicken breast (200g)", "1 adult bowl of oatmeal (300g)". Never use small units like slices, cups, or tablespoons — always a full plate or meal-sized portion an adult would actually eat.
portionGrams: grams for that full adult portion.
All nutrition values are for that one portion. Round to 1 decimal. Never return null for numeric fields.
confidence: "high" if well-known food, "medium" if approximate, "low" if very uncertain.`;

app.post("/api/lookup", async (req, res) => {
  try {
    const { foodName } = req.body || {};
    if (!foodName) return res.status(400).json({ error: "Missing foodName" });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Server missing ANTHROPIC_API_KEY in .env" });
    }

    const body = {
      model: MODEL,
      max_tokens: 400,
      system: LOOKUP_PROMPT,
      messages: [{ role: "user", content: `Food: "${foodName.trim()}"` }],
    };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("Anthropic API error:", r.status, errText);
      return res.status(502).json({ error: "Anthropic API error", status: r.status, detail: errText });
    }

    const data = await r.json();
    const text = data?.content?.[0]?.text ?? "";
    const cleaned = stripFences(text);

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) {
      console.error("JSON parse failed. Raw:", text);
      return res.status(502).json({ error: "Model did not return valid JSON", raw: text });
    }

    const numKeys = ["portionGrams", "carbs", "calories", "protein", "fat", "sugar", "fiber"];
    for (const k of numKeys) {
      const n = Number(parsed[k]);
      parsed[k] = Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
    }
    if (!["low", "medium", "high"].includes(parsed.confidence)) parsed.confidence = "medium";
    parsed.foodName = String(parsed.foodName ?? foodName);
    parsed.portionLabel = String(parsed.portionLabel ?? `${parsed.portionGrams}g`);

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`CarbSnap server listening on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("WARNING: ANTHROPIC_API_KEY not set. Edit ../.env");
  }
});
