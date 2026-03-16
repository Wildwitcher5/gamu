import { prisma } from '../lib/prisma.js';

const COLUMN_MAP = [
  // Мета (7)
  ["session_id",        "ID сессии"],
  ["ts_s1_start",       "Начало опроса 1"],
  ["ts_s1_end",         "Конец опроса 1"],
  ["ts_game_end",       "Конец игры"],
  ["ts_s2_end",         "Конец опроса 2"],
  ["condition",         "Условие"],
  ["ally_nick",         "Ник союзника"],

  // Демография (4)
  ["dem_gender",        "Пол"],
  ["dem_age",           "Возраст"],
  ["dem_education",     "Образование"],
  ["dem_income",        "Доход"],

  // Позиция / группа (3)
  ["s1_direction",      "Позиция (до, 1-5)"],
  ["s1_ingroup",        "Группа (до)"],
  ["s2_ingroup",        "Группа (после)"],

  // Индексы поляризации — до (7)
  ["s1_polar_index",    "Поляризация до"],
  ["s1_traits_diff",    "Черты: разность (до)"],
  ["s1_affect_diff",    "Термометр: разность (до)"],
  ["s1_dist_diff",      "Дистанция: разность (до)"],
  ["s1_coop_diff",      "Кооперация: разность (до)"],
  ["s1_repr_diff",      "Репрессии: разность (до)"],
  ["s1_threat_diff",    "Угроза: разность (до)"],

  // Индексы поляризации — после (7)
  ["s2_polar_index",    "Поляризация после"],
  ["s2_traits_diff",    "Черты: разность (после)"],
  ["s2_affect_diff",    "Термометр: разность (после)"],
  ["s2_dist_diff",      "Дистанция: разность (после)"],
  ["s2_coop_diff",      "Кооперация: разность (после)"],
  ["s2_repr_diff",      "Репрессии: разность (после)"],
  ["s2_threat_diff",    "Угроза: разность (после)"],

  // Дельты (7)
  ["delta_polar",       "Δ поляризация"],
  ["delta_traits",      "Δ черты"],
  ["delta_affect",      "Δ термометр"],
  ["delta_dist",        "Δ дистанция"],
  ["delta_coop",        "Δ кооперация"],
  ["delta_repr",        "Δ репрессии"],
  ["delta_threat",      "Δ угроза"],

  // Термометр сырой (4) — полезно для отчётов
  ["s1_affect_out",     "Термометр аутГ до"],
  ["s1_affect_in",      "Термометр инГ до"],
  ["s2_affect_out",     "Термометр аутГ после"],
  ["s2_affect_in",      "Термометр инГ после"],

  // Игра (4)
  ["game_enjoyment",    "Оценка игры"],
  ["game_engagement",   "Вовлечённость"],
  ["game_frequency",    "Частота игр"],
  ["game_guess",        "Догадка об исследовании"],
];
// Итого: 43 колонки

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
