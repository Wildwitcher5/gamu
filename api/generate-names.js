export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { ingroup } = req.body;

  const prompt = ingroup === "approve"
    ? `Придумай два игровых никнейма для противников. Они символизируют людей, которые НЕ поддерживают курс России — можно с лёгкой иронией типо Штефанов, ИнАгент, Трамп, ПолитЗек, или нейтральные. Формат JSON: {"e1": "ник1", "e2": "ник2"}. Только JSON.`
    : `Придумай два игровых никнейма для противников. Они символизируют людей, которые поддерживают курс России — типо Путин, Слышу_ZoV, Киви, Слоняра, или нейтральные. Формат JSON: {"e1": "ник1", "e2": "ник2"}. Только JSON.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL ?? "https://localhost",
        "X-Title": "Druzhina",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        max_tokens: 60,
        temperature: 1.0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "{}";
    const names = JSON.parse(text.replace(/```json|```/g, "").trim());
    return res.status(200).json(names);
  } catch (err) {
    console.error("generate-names error:", err);
    return res.status(200).json({ e1: "Стражник", e2: "Лазутчик" });
  }
}
