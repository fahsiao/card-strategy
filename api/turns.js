import { db } from '../src/db/index.js'
import { turns } from '../src/db/schema.js'
import { eq, desc } from 'drizzle-orm'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(turns).orderBy(desc(turns.paidAt)).limit(50)
      return res.json(rows.map(r => ({ id: r.id, bucket: r.bucket, person: r.person, paid_at: r.paidAt })))
    }

    if (req.method === 'POST') {
      const { bucket, person } = req.body
      const row = await db.insert(turns)
        .values({ bucket, person, paidAt: new Date().toISOString() })
        .returning()
      const r = row[0]
      return res.json({ id: r.id, bucket: r.bucket, person: r.person, paid_at: r.paidAt })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body
      await db.delete(turns).where(eq(turns.id, id))
      return res.json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('turns error:', err)
    res.status(500).json({ error: err.message })
  }
}
