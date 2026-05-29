const LOOKUP_PROMPT = `You are a nutrition database. Given a food name, return nutritional values for one standard serving of that food.

Respond with ONLY a single valid JSON object, no prose, no markdown fences. Shape:
{"foodName": string, "portionLabel": string, "portionGrams": number, "carbs": number, "calories": number, "protein": number, "fat": number, "sugar": number, "fiber": number, "confidence": "low"|"medium"|"high"}

portionLabel: describe one realistic adult meal portion. Never use small units like slices, cups, or tablespoons — always a full plate or meal-sized portion an adult would actually eat. E.g. "1 adult plate of pasta (350g)", "1 full chicken breast (200g)".
portionGrams: grams for that full adult portion.
All nutrition values are for that one portion. Round to 1 decimal. Never return null for numeric fields.
confidence: "high" if well-known food, "medium" if approximate, "low" if very uncertain.`;

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

  const { foodName } = req.body || {};
  if (!foodName) return res.status(400).json({ error: "Missing foodName" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

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
        max_tokens: 400,
        system: LOOKUP_PROMPT,
        messages: [{ role: "user", content: `Food: "${foodName.trim()}"` }],
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
    parsed.foodName = String(parsed.foodName ?? foodName);
    parsed.portionLabel = String(parsed.portionLabel ?? `${parsed.portionGrams}g`);

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err?.message || err) });
  }
};
