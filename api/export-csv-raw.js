import { prisma } from '../lib/prisma.js';

// All research-relevant fields in logical order — avatars excluded (base64 images break Excel)
const RAW_FIELDS = [
  // Session status (use this to filter: "complete" = both surveys done)
  "status",
  // Meta
  "session_id", "condition", "s1_ingroup", "ally_nick",
  "ts_s1_start", "ts_s1_end", "ts_game_end", "ts_s2_end",
  // Demographics
  "dem_gender", "dem_age", "dem_education", "dem_income",
  // Nicknames (text, no images)
  "nick_self",
  // S1 direction
  "s1_direction",
  // S1 raw trait items (6 out + 6 in)
  ...Array.from({length:6}, (_,i) => `s1_traits_out_${i+1}`),
  ...Array.from({length:6}, (_,i) => `s1_traits_in_${i+1}`),
  // S1 affect
  "s1_affect_out", "s1_affect_in",
  // S1 distance items (4 out + 4 in)
  ...Array.from({length:4}, (_,i) => `s1_dist_out_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s1_dist_in_${i+1}`),
  // S1 cooperation items
  ...Array.from({length:4}, (_,i) => `s1_coop_out_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s1_coop_in_${i+1}`),
  // S1 repression items
  ...Array.from({length:5}, (_,i) => `s1_repr_out_${i+1}`),
  ...Array.from({length:5}, (_,i) => `s1_repr_in_${i+1}`),
  // S1 threat items
  ...Array.from({length:4}, (_,i) => `s1_threat_out_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s1_threat_in_${i+1}`),
  // S1 contact items
  ...Array.from({length:4}, (_,i) => `s1_contact_out_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s1_contact_in_${i+1}`),
  // S1 computed indices
  "s1_traits_in_mean", "s1_traits_out_mean", "s1_traits_diff",
  "s1_affect_diff",
  "s1_dist_in_mean", "s1_dist_out_mean", "s1_dist_diff",
  "s1_coop_in_mean", "s1_coop_out_mean", "s1_coop_diff",
  "s1_repr_in_mean", "s1_repr_out_mean", "s1_repr_diff",
  "s1_threat_in_mean", "s1_threat_out_mean", "s1_threat_diff",
  "s1_polar_index",
  // S2 direction / ingroup (same as s1, re-asked for stability check)
  "s2_direction", "s2_ingroup",
  // S2 raw items (same scales as S1, no contact/demo/dir screens)
  ...Array.from({length:6}, (_,i) => `s2_traits_out_${i+1}`),
  ...Array.from({length:6}, (_,i) => `s2_traits_in_${i+1}`),
  "s2_affect_out", "s2_affect_in",
  ...Array.from({length:4}, (_,i) => `s2_dist_out_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s2_dist_in_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s2_coop_out_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s2_coop_in_${i+1}`),
  ...Array.from({length:5}, (_,i) => `s2_repr_out_${i+1}`),
  ...Array.from({length:5}, (_,i) => `s2_repr_in_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s2_threat_out_${i+1}`),
  ...Array.from({length:4}, (_,i) => `s2_threat_in_${i+1}`),
  // S2 computed indices
  "s2_traits_in_mean", "s2_traits_out_mean", "s2_traits_diff",
  "s2_affect_diff",
  "s2_dist_in_mean", "s2_dist_out_mean", "s2_dist_diff",
  "s2_coop_in_mean", "s2_coop_out_mean", "s2_coop_diff",
  "s2_repr_in_mean", "s2_repr_out_mean", "s2_repr_diff",
  "s2_threat_in_mean", "s2_threat_out_mean", "s2_threat_diff",
  "s2_polar_index",
  // Deltas
  "delta_polar", "delta_traits", "delta_affect", "delta_dist",
  "delta_coop", "delta_repr", "delta_threat",
  // Game feedback (from post-game survey)
  "game_enjoyment", "game_engagement", "game_frequency", "game_guess",
];

function esc(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export default async function handler(req, res) {
  if (req.query.secret !== process.env.ADMIN_SECRET) {
    console.warn('export-csv-raw auth failed, ip:', req.headers['x-forwarded-for'] || req.socket?.remoteAddress);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rows = await prisma.response.findMany({
      orderBy: { created_at: 'asc' },
      select:  { data: true, status: true },
    });

    if (rows.length === 0) return res.status(200).send('No data');

    // Merge DB-level status into the data object so it appears in the CSV
    const allData = rows
      .map(r => r.data ? { ...r.data, status: r.status } : null)
      .filter(Boolean);

    if (allData.length === 0) return res.status(200).send('No data');

    const bom = '\uFEFF';
    const csvRows = [
      RAW_FIELDS.join(','),
      ...allData.map(row => RAW_FIELDS.map(h => esc(row[h])).join(',')),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="responses_raw.csv"');
    return res.status(200).send(bom + csvRows.join('\r\n'));
  } catch (err) {
    console.error('export-csv-raw error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
