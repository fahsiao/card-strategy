import { db } from '../src/db/index.js'
import { trips } from '../src/db/schema.js'
import { eq, desc } from 'drizzle-orm'

const fmt = (r) => ({ id: r.id, name: r.name, created_at: r.createdAt })

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(trips).orderBy(desc(trips.createdAt))
      return res.json(rows.map(fmt))
    }

    if (req.method === 'POST') {
      const { name } = req.body
      const row = await db.insert(trips).values({ name }).returning()
      return res.json(fmt(row[0]))
    }

    if (req.method === 'PUT') {
      const { id, name } = req.body
      const row = await db.update(trips).set({ name }).where(eq(trips.id, id)).returning()
      return res.json(fmt(row[0]))
    }

    if (req.method === 'DELETE') {
      const { id } = req.body
      await db.delete(trips).where(eq(trips.id, id))
      return res.json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('trips error:', err)
    res.status(500).json({ error: err.message })
  }
}
