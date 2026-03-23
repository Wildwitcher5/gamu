import { prisma } from '../lib/prisma.js';

const EXCLUDE = new Set(['avatar_self', 'avatar_partner', 'status', 'session_id']);

export default async function handler(req, res) {
  if (req.query.secret !== process.env.ADMIN_SECRET) {
    console.warn('export auth failed, ip:', req.headers['x-forwarded-for'] || req.socket?.remoteAddress);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rows = await prisma.response.findMany({
      where:   { status: 'complete' },
      orderBy: { created_at: 'asc' },
      select:  { session_id: true, created_at: true, data: true },
    });

    const clean = rows.map(({ session_id, created_at, data }) => {
      const filtered = Object.fromEntries(
        Object.entries(data).filter(([k]) => !EXCLUDE.has(k))
      );
      return { session_id, created_at, ...filtered };
    });

    return res.status(200).json({ count: clean.length, rows: clean });
  } catch (err) {
    console.error('export error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
