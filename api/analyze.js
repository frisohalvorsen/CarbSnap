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
  return text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-access-code");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const code = req.headers["x-access-code"];
  if (!process.env.ACCESS_CODE || code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Invalid access code" });
  }

  const { imageBase64, mediaType = "image/jpeg", hintFoodName } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: "Missing imageBase64" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const userText = hintFoodName
    ? `The user says this food is: "${hintFoodName}". Use that as the food identity and estimate nutrition for the visible portion. Return JSON only.`
    : `Analyze the visible food and return JSON only.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: userText },
          ],
        }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(502).json({ error: "Anthropic API error", status: r.status, detail: errText });
    }

    const data = await r.json();
    const cleaned = stripFences(data?.content?.[0]?.text ?? "");
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch { return res.status(502).json({ error: "Model did not return valid JSON", raw: cleaned }); }

    for (const k of ["portionGrams","carbs","calories","protein","fat","sugar","fiber"]) {
      const n = Number(parsed[k]);
      parsed[k] = Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
    }
    if (!["low","medium","high"].includes(parsed.confidence)) parsed.confidence = "medium";
    parsed.foodName = String(parsed.foodName ?? "Unknown food");
    parsed.portionLabel = String(parsed.portionLabel ?? `${parsed.portionGrams}g`);

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err?.message || err) });
  }
};
