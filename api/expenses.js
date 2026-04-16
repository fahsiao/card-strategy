import { db } from '../src/db/index.js'
import { expenses } from '../src/db/schema.js'
import { eq, desc } from 'drizzle-orm'

const fmt = (r) => ({ id: r.id, trip_id: r.tripId, name: r.name, amount: r.amount, paid_by: r.paidBy, split_among: r.splitAmong, notes: r.notes, created_at: r.createdAt })

export default async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
    const tripId = searchParams.get('tripId')

    if (req.method === 'GET') {
      if (!tripId) return res.status(400).json({ error: 'tripId required' })
      const rows = await db.select().from(expenses)
        .where(eq(expenses.tripId, tripId))
        .orderBy(desc(expenses.createdAt))
      return res.json(rows.map(fmt))
    }

    if (req.method === 'POST') {
      const { trip_id, name, amount, paid_by, split_among, notes } = req.body
      const row = await db.insert(expenses)
        .values({ tripId: trip_id, name, amount, paidBy: paid_by, splitAmong: split_among, notes: notes || null })
        .returning()
      return res.json(fmt(row[0]))
    }

    if (req.method === 'PUT') {
      const { id, name, amount, paid_by, split_among, notes } = req.body
      const row = await db.update(expenses)
        .set({ name, amount, paidBy: paid_by, splitAmong: split_among, notes: notes || null })
        .where(eq(expenses.id, id))
        .returning()
      return res.json(fmt(row[0]))
    }

    if (req.method === 'DELETE') {
      const { id } = req.body
      await db.delete(expenses).where(eq(expenses.id, id))
      return res.json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('expenses error:', err)
    res.status(500).json({ error: err.message })
  }
}
