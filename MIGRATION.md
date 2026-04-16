# Migration: Supabase → Neon + Drizzle

**Date:** 2026-04-16
**Status:** Planned
**Why:** Supabase Pro charges $25/org + $10/project/month. Card-strategy has no auth, no file storage -- just a database with realtime sync. Moving to Neon (free Postgres) + Drizzle ORM saves $10/month and frees up a Supabase slot for commercial projects.

## Current State

- **Database:** Supabase Postgres (free tier project)
- **Client:** `@supabase/supabase-js` v2.45
- **Tables:** `balances`, `turns`, `trips`, `trip_members`, `expenses`, `grocery_items`
- **Auth:** None (RLS policies allow all access)
- **Realtime:** Used for live sync between Eric and Christine's devices (optimistic updates with skip flag)
- **Schema:** `supabase-setup.sql`
- **Data access:** `src/supabase.js` with CRUD helpers + Realtime subscriptions

## The One Complication: Realtime

Supabase Realtime (WebSocket-based live sync) is the only platform feature card-strategy actually uses beyond basic CRUD. Neon doesn't have built-in realtime.

**Options to replace realtime:**
1. **Polling** -- simplest. Fetch data every 5-10 seconds. Good enough for 2 users. No extra deps.
2. **Supabase Realtime standalone** -- Supabase's realtime server is open source, but overkill to self-host for this.
3. **PartyKit / Liveblocks** -- managed realtime services with free tiers. More moving parts.
4. **Just skip it** -- if you and Christine aren't editing simultaneously often, polling or manual refresh works fine.

**Recommendation:** Start with polling (option 1). If the lag is annoying, add PartyKit later. For a points tracker between 2 people, 5-second polling is invisible.

## Migration Steps

### 1. Set up Neon
- Create Neon account at https://neon.tech (free)
- Create project "personal-apps" (or use existing if already created for pokemon-tcg)
- Copy the connection string (`DATABASE_URL`)

### 2. Export data from Supabase
```bash
# Get connection string from Supabase dashboard > Settings > Database > Connection string
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --data-only --no-owner --no-acl \
  -t balances -t turns -t trips -t trip_members -t expenses -t grocery_items \
  > card-strategy-data.sql
```

### 3. Create tables in Neon
Run the schema SQL (without RLS/realtime parts) in Neon's SQL editor, or let Drizzle handle it via `drizzle-kit push`.

### 4. Import data into Neon
```bash
psql "postgresql://[neon-connection-string]" < card-strategy-data.sql
```

### 5. Install Drizzle + Neon
```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

### 6. Create Drizzle schema
Create `src/db/schema.js` defining all 5 tables using Drizzle's `pgTable()`. This replaces `supabase-setup.sql`.

### 7. Create Drizzle client
Create `src/db/index.js` with Neon serverless connection using `DATABASE_URL`.

### 8. Rewrite `src/supabase.js` → `src/db/queries.js`
Replace Supabase CRUD helpers with Drizzle queries. Same function signatures, different internals:
- `supabase.from('balances').select('*')` → `db.select().from(balances)`
- `supabase.from('balances').upsert(data)` → `db.insert(balances).values(data).onConflictDoUpdate(...)`
- etc.

### 9. Replace Realtime with polling
Replace `subscribeBalances()` and `subscribeTurns()` with a `useEffect` interval that refetches every 5 seconds. Same result for 2 users, zero infrastructure.

### 10. Update `.env`
```
# Remove
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Add
VITE_DATABASE_URL=postgresql://...@ep-something.neon.tech/neondb
```

### 11. Remove Supabase dependency
```bash
npm uninstall @supabase/supabase-js
```

### 12. Test everything
- Balances CRUD works
- Turns logging works
- Trips/expenses work
- Grocery list works
- Sync between 2 devices works (polling)

### 13. Deploy + delete Supabase project
- Deploy updated app
- Verify production works
- Delete card-strategy project from Supabase dashboard
- Downgrade Supabase back to free tier if no longer on Pro

## Files That Change

| File | Change |
|------|--------|
| `src/supabase.js` | Delete (replaced by `src/db/`) |
| `src/db/schema.js` | New -- Drizzle table definitions |
| `src/db/index.js` | New -- Neon + Drizzle client |
| `src/db/queries.js` | New -- CRUD helpers (same API as old supabase.js) |
| `src/App.jsx` | Update imports from `supabase.js` → `db/queries.js`, replace realtime subscriptions with polling |
| `package.json` | Swap `@supabase/supabase-js` for `drizzle-orm` + `@neondatabase/serverless` |
| `.env.local` | `DATABASE_URL` instead of Supabase keys |
| `supabase-setup.sql` | Keep as reference, no longer used |
| `drizzle.config.js` | New -- Drizzle Kit config for migrations |
