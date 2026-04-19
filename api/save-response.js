import { prisma } from '../lib/prisma.js';

// Status progression: 'incomplete' < 'complete'. Never allow regression.
const STATUS_RANK = { incomplete: 1, complete: 2 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { session_id, status, data } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  if (!data) return res.status(400).json({ error: 'data required' });

  try {
    const existing = await prisma.response.findUnique({ where: { session_id } });

    if (!existing) {
      await prisma.response.create({ data: { session_id, status, data } });
      return res.status(200).json({ ok: true, created: true });
    }

    // Merge: keep every non-null field from the existing record that the new payload
    // doesn't override. Prevents a mid-flow 'incomplete' POST from wiping S2 fields
    // a later 'complete' POST had written, and vice versa on retries.
    const mergedData = { ...(existing.data || {}) };
    for (const [k, v] of Object.entries(data || {})) {
      if (v !== null && v !== undefined) mergedData[k] = v;
    }

    // Status can only move forward. A mid-flow 'incomplete' write must NOT
    // downgrade a row already at 'complete'.
    const existingRank = STATUS_RANK[existing.status] || 0;
    const incomingRank = STATUS_RANK[status] || 0;
    const finalStatus = incomingRank >= existingRank ? status : existing.status;

    await prisma.response.update({
      where: { session_id },
      data: { status: finalStatus, data: mergedData },
    });
    return res.status(200).json({ ok: true, updated: true });
  } catch (err) {
    console.error('save-response error:', err, 'session_id:', session_id);
    return res.status(500).json({ error: 'Database error' });
  }
}
