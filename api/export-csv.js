import { prisma } from '../lib/prisma.js';

const EXPORT_COLUMNS = [
  "session_id", "status", "ts_s1_start", "ts_s1_end", "ts_game_end", "ts_s2_end", "condition",
  "dem_gender", "dem_age", "dem_education", "dem_income",
  "nick_self", "ally_nick",
  "s1_direction", "s1_ingroup",
  ...Array.from({ length: 6 }, (_, i) => `s1_traits_out_${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `s1_traits_in_${i + 1}`),
  "s1_affect_out", "s1_affect_in",
  ...Array.from({ length: 4 }, (_, i) => `s1_dist_out_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s1_dist_in_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s1_coop_out_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s1_coop_in_${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `s1_repr_out_${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `s1_repr_in_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s1_threat_out_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s1_threat_in_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s1_contact_out_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s1_contact_in_${i + 1}`),
  "s1_traits_in_mean", "s1_traits_out_mean", "s1_traits_diff",
  "s1_affect_diff",
  "s1_dist_in_mean", "s1_dist_out_mean", "s1_dist_diff",
  "s1_coop_in_mean", "s1_coop_out_mean", "s1_coop_diff",
  "s1_repr_in_mean", "s1_repr_out_mean", "s1_repr_diff",
  "s1_threat_in_mean", "s1_threat_out_mean", "s1_threat_diff",
  "s1_polar_index",
  "s2_direction", "s2_ingroup",
  ...Array.from({ length: 6 }, (_, i) => `s2_traits_out_${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `s2_traits_in_${i + 1}`),
  "s2_affect_out", "s2_affect_in",
  ...Array.from({ length: 4 }, (_, i) => `s2_dist_out_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s2_dist_in_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s2_coop_out_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s2_coop_in_${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `s2_repr_out_${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `s2_repr_in_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s2_threat_out_${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `s2_threat_in_${i + 1}`),
  "s2_traits_in_mean", "s2_traits_out_mean", "s2_traits_diff",
  "s2_affect_diff",
  "s2_dist_in_mean", "s2_dist_out_mean", "s2_dist_diff",
  "s2_coop_in_mean", "s2_coop_out_mean", "s2_coop_diff",
  "s2_repr_in_mean", "s2_repr_out_mean", "s2_repr_diff",
  "s2_threat_in_mean", "s2_threat_out_mean", "s2_threat_diff",
  "s2_polar_index",
  "delta_polar", "delta_traits", "delta_affect",
  "delta_dist", "delta_coop", "delta_repr", "delta_threat",
  "game_enjoyment", "game_engagement", "game_frequency", "game_guess",
];

function escapeCell(value) {
  if (value == null) return '';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default async function handler(req, res) {
  if (req.query.secret !== process.env.ADMIN_SECRET) {
    console.warn('export-csv auth failed, ip:', req.headers['x-forwarded-for'] || req.socket?.remoteAddress);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rows = await prisma.response.findMany({
      where:   { status: 'complete' },
      orderBy: { created_at: 'asc' },
      select:  { data: true },
    });

    if (rows.length === 0) return res.status(200).send('No completed responses yet.');

    const bom = '\uFEFF';
    const csv = [
      EXPORT_COLUMNS.join(','),
      ...rows.map(row => EXPORT_COLUMNS.map(col => escapeCell((row.data ?? {})[col])).join(',')),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="responses.csv"');
    return res.status(200).send(bom + csv);
  } catch (err) {
    console.error('export-csv error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
