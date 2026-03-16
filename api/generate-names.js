export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { condition, ingroup } = req.body;

  const prompt = condition === "cond_4"
    ? `Придумай два случайных игровых никнейма для двух противников в средневековой карточной игре. Никнеймы нейтральные, без политики. Формат JSON: {"e1": "ник1", "e2": "ник2"}. Только JSON, ничего кроме JSON.`
    : ingroup === "approve"
      ? `Придумай два игровых никнейма для противников. Они символизируют людей, которые НЕ поддерживают курс России — можно с лёгкой иронией типо Штефанов, ИнАгент, Трамп, ПолитЗек, или нейтральные. Формат JSON: {"e1": "ник1", "e2": "ник2"}. Только JSON.`
      : `Придумай два игровых никнейма для противников. Они символизируют людей, которые поддерживают курс России — типо Путин, Слышу_ZoV, Киви, Слоняра, или нейтральные. Формат JSON: {"e1": "ник1", "e2": "ник2"}. Только JSON.`;

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: 60,
      temperature: 1.0,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  try {
    const text = data.choices?.[0]?.message?.content ?? "{}";
    const names = JSON.parse(text.replace(/```json|```/g, "").trim());
    return res.status(200).json(names);
  } catch {
    return res.status(200).json({ e1: "Стражник", e2: "Лазутчик" });
  }
}
