import { prisma } from '../lib/prisma.js';

export default async function handler(req, res) {
  if (req.query.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rows = await prisma.response.findMany({
      where:   { status: 'complete' },
      orderBy: { created_at: 'asc' },
      select:  { session_id: true, created_at: true, data: true },
    });
    return res.status(200).json(rows);
  } catch (err) {
    console.error('export error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
