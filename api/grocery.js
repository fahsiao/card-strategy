import { db } from '../src/db/index.js'
import { groceryItems } from '../src/db/schema.js'
import { eq } from 'drizzle-orm'

const fmt = (r) => ({ id: r.id, name: r.name, checked: r.checked, created_at: r.createdAt })

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(groceryItems).orderBy(groceryItems.createdAt)
      return res.json(rows.map(fmt))
    }

    if (req.method === 'POST') {
      const { name } = req.body
      const row = await db.insert(groceryItems).values({ name }).returning()
      return res.json(fmt(row[0]))
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body
      const updates = {}
      if ('name' in fields) updates.name = fields.name
      if ('checked' in fields) updates.checked = fields.checked
      const row = await db.update(groceryItems).set(updates).where(eq(groceryItems.id, id)).returning()
      return res.json(fmt(row[0]))
    }

    if (req.method === 'DELETE') {
      const { id, clearChecked } = req.body
      if (clearChecked) {
        await db.delete(groceryItems).where(eq(groceryItems.checked, true))
      } else {
        await db.delete(groceryItems).where(eq(groceryItems.id, id))
      }
      return res.json({ ok: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('grocery error:', err)
    res.status(500).json({ error: err.message })
  }
}
