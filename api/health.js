module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-access-code");
  if (req.method === "OPTIONS") return res.status(200).end();

  const code = req.headers["x-access-code"];
  if (!process.env.ACCESS_CODE || code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ ok: false, error: "Invalid access code" });
  }
  res.json({ ok: true, hasKey: !!process.env.ANTHROPIC_API_KEY });
};
