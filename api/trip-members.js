import { db } from '../src/db/index.js'
import { tripMembers } from '../src/db/schema.js'
import { eq, and } from 'drizzle-orm'

const fmt = (r) => ({ id: r.id, trip_id: r.tripId, name: r.name, created_at: r.createdAt })

export default async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
    const tripId = searchParams.get('tripId')

    if (req.method === 'GET') {
      if (!tripId) return res.status(400).json({ error: 'tripId required' })
      const rows = await db.select().from(tripMembers)
        .where(eq(tripMembers.tripId, tripId))
        .orderBy(tripMembers.createdAt)
      return res.json(rows.map(fmt))
    }

    if (req.method === 'POST') {
      const { trip_id, name } = req.body
      const row = await db.insert(tripMembers).values({ tripId: trip_id, name }).returning()
      return res.json(fmt(row[0]))
    }

    if (req.method === 'DELETE') {
      const { id, trip_id } = req.body
      await db.delete(tripMembers)
        .where(and(eq(tripMembers.id, id), eq(tripMembers.tripId, trip_id)))
      return res.json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('trip-members error:', err)
    res.status(500).json({ error: err.message })
  }
}
