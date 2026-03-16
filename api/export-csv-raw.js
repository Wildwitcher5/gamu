import { prisma } from '../lib/prisma.js';

export default async function handler(req, res) {
  if (req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rows = await prisma.response.findMany({
      where:   { status: 'complete' },
      orderBy: { created_at: 'asc' },
      select:  { data: true },
    });

    if (rows.length === 0) return res.status(200).send('No data');

    const allData = rows.map(r => r.data);
    const headers = Object.keys(allData[0]);
    const bom = '\uFEFF';
    const csvRows = [
      headers.join(','),
      ...allData.map(row =>
        headers.map(h => {
          const val = row[h] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="responses.csv"');
    return res.status(200).send(bom + csvRows.join('\r\n'));
  } catch (err) {
    console.error('export-csv error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
