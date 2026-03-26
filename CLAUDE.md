# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture

React 18 + Vite PWA for tracking credit card points and payment turns, with Supabase for real-time sync between devices. Designed as an iOS/Android home-screen app.

### Key files

- **src/App.jsx** — Monolithic single-file component containing all UI, state, and logic. Five tabs: Swipe, Turns, Trips, Points, Cards. Hardcoded strategy data (spending categories, card lists, transfer partners, key dates) lives at the top.
- **src/supabase.js** — Supabase client with CRUD helpers (`getBalances`, `upsertBalance`, `deleteBalance`, `getTurns`, `logTurn`, `deleteTurn`) and Realtime subscription functions (`subscribeBalances`, `subscribeTurns`).
- **supabase-setup.sql** — Database schema (tables: `balances`, `turns`) with RLS policies and seed data.

### Patterns

- **Optimistic updates with skip flag**: Local state updates immediately, then syncs to Supabase. A `skipRef` flag prevents the Realtime subscription callback from re-applying the same change.
- **All inline styles**: No CSS modules or styled-components. Color constants in `C` (brand colors) and `UI` (theme colors). Fonts: JetBrains Mono (mono), Outfit (display), DM Sans (body via CSS).
- **Abbreviated names**: `progs`, `upd()`, `addP()`, `rm()`, `fmtDate()`. Follow existing conventions.
- **No component decomposition**: Inline helper components (`Badge`, `Dot`, `PC`, `Note`) are defined inside App.jsx, not extracted to separate files.
- **Environment variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`).
