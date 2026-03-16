import { prisma } from '../lib/prisma.js';

const COLUMN_MAP = [
  // Условие и группа — первыми, для фильтрации в Excel/SPSS/jamovi/R
  ["condition",        "Условие"],          // cond_1 / cond_2 / cond_3 / cond_4
  ["s1_ingroup",       "Группа участника"], // approve / disapprove

  // Демография
  ["dem_gender",       "Пол"],
  ["dem_age",          "Возраст"],
  ["dem_education",    "Образование"],
  ["dem_income",       "Доход"],

  // Политическая позиция
  ["s1_direction",     "Позиция по России до (1-5)"],

  // Индексы поляризации до игры
  ["s1_polar_index",   "Поляризация до игры"],
  ["s1_traits_diff",   "Черты: разность до"],
  ["s1_affect_diff",   "Термометр: разность до"],
  ["s1_dist_diff",     "Дистанция: разность до"],
  ["s1_coop_diff",     "Кооперация: разность до"],
  ["s1_repr_diff",     "Репрессии: разность до"],
  ["s1_threat_diff",   "Угроза: разность до"],

  // Термометр сырой до (4 значения — нужны для перепроверки)
  ["s1_affect_out",    "Термометр аутГ до"],
  ["s1_affect_in",     "Термометр инГ до"],
  ["s2_affect_out",    "Термометр аутГ после"],
  ["s2_affect_in",     "Термометр инГ после"],

  // Индексы поляризации после игры
  ["s2_polar_index",   "Поляризация после игры"],
  ["s2_traits_diff",   "Черты: разность после"],
  ["s2_affect_diff",   "Термометр: разность после"],
  ["s2_dist_diff",     "Дистанция: разность после"],
  ["s2_coop_diff",     "Кооперация: разность после"],
  ["s2_repr_diff",     "Репрессии: разность после"],
  ["s2_threat_diff",   "Угроза: разность после"],

  // Дельты — главные переменные для ANOVA
  ["delta_polar",      "Δ Поляризация"],
  ["delta_traits",     "Δ Черты"],
  ["delta_affect",     "Δ Термометр"],
  ["delta_dist",       "Δ Дистанция"],
  ["delta_coop",       "Δ Кооперация"],
  ["delta_repr",       "Δ Репрессии"],
  ["delta_threat",     "Δ Угроза"],

  // Игра
  ["game_enjoyment",   "Оценка игры"],
  ["game_engagement",  "Вовлечённость"],
  ["game_frequency",   "Частота игр"],
  ["game_guess",       "Догадка об исследовании"],
];
// Итого: 37 колонок

function escapeCell(val) {
  if (val === null || val === undefined) return "";
  return `"${String(val).replace(/"/g, '""')}"`;
}

export default async function handler(req, res) {
  if (req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rows = await prisma.response.findMany({
    where: { status: "complete" },
    orderBy: { created_at: "asc" },
    select: { data: true },
  });

  if (rows.length === 0) return res.status(200).send("No data");

  const allData = rows.map(r => r.data);
  const keys    = COLUMN_MAP.map(([k]) => k);
  const labels  = COLUMN_MAP.map(([, l]) => l);

  const bom = "\uFEFF";
  const csvRows = [
    labels.map(l => `"${l}"`).join(","),
    ...allData.map(row => keys.map(k => escapeCell(row[k])).join(",")),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="responses_clean.csv"');
  return res.status(200).send(bom + csvRows.join("\r\n"));
}
