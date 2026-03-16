import { prisma } from '../lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { session_id, status, data } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    await prisma.response.upsert({
      where:  { session_id },
      update: { status, data },
      create: { session_id, status, data },
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('save-response error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
