import { db } from '../src/db/index.js'
import { balances } from '../src/db/schema.js'
import { eq } from 'drizzle-orm'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(balances).orderBy(balances.createdAt)
      return res.json(rows.map(r => ({ id: r.id, label: r.label, value: r.value, color: r.color, is_system: r.isSystem, updated_at: r.updatedAt, created_at: r.createdAt })))
    }

    if (req.method === 'PUT') {
      const { id, label, value, color, is_system, updated_at } = req.body
      const ts = updated_at ? new Date(updated_at) : new Date()
      const row = await db.insert(balances)
        .values({ id, label, value, color, isSystem: is_system || false, updatedAt: ts })
        .onConflictDoUpdate({
          target: balances.id,
          set: { label, value, color, isSystem: is_system || false, updatedAt: ts },
        })
        .returning()
      return res.json(row[0])
    }

    if (req.method === 'DELETE') {
      const { id } = req.body
      await db.delete(balances).where(eq(balances.id, id))
      return res.json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('balances error:', err)
    res.status(500).json({ error: err.message })
  }
}
