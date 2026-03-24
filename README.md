# Card Strategy Dashboard

Eric + Christine credit card strategy dashboard with real-time balance sync.

## Setup (15 minutes)

### Step 1: Create Supabase project (free tier)

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click "New Project"
3. Name it `card-strategy`, set a database password, pick the closest region (West US)
4. Wait ~2 minutes for the project to provision

### Step 2: Create the database table

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy-paste the entire contents of `supabase-setup.sql` into the editor
4. Click "Run" (or Cmd+Enter)
5. You should see "Success. No rows returned" -- that's correct

### Step 3: Get your API keys

1. In Supabase, go to **Settings** > **API** (left sidebar)
2. Copy the **Project URL** (looks like `https://abc123.supabase.co`)
3. Copy the **anon / public** key (the long string under "Project API keys")

### Step 4: Set up the project locally

```bash
# Clone or download this folder, then:
cd card-strategy
npm install

# Create your env file
cp .env.example .env.local
```

Edit `.env.local` and paste your Supabase URL and anon key:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5: Test locally

```bash
npm run dev
```

Open `http://localhost:5173` -- you should see the dashboard. Try entering a balance number. Open the same URL in another browser tab and watch it sync in real-time.

### Step 6: Deploy to Vercel

1. Push the project to a GitHub repo (private is fine)
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "Import Project" and select your repo
4. Vercel auto-detects Vite -- leave settings as default
5. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Click "Deploy"
7. Your app will be live at `https://your-project.vercel.app`

### Step 7: Add to iPhone home screen

1. Open your Vercel URL in Safari on your iPhone
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name it "Cards" and tap Add
5. Send the URL to Christine so she can do the same

The app will open full-screen like a native app with the dark background matching the status bar.

## How it works

- **Swipe guide** -- which card to use at the register
- **Trip planner** -- how to book travel and redeem points
- **Balances** -- editable point totals, synced in real-time via Supabase
- **Cards** -- inventory of all cards for both people

Balances sync instantly between devices. When Eric updates his CSR balance on his phone, Christine sees it update on hers within seconds.

## Updating the strategy

The swipe guide, trip planner, transfer partners, and card inventory are all hardcoded in `src/App.jsx`. When you need to make changes (new card, strategy shift, partner updates), update the data arrays in that file and redeploy. Vercel auto-deploys on git push.

## App icons

Replace `public/icon-180.png` and `public/icon-192.png` and `public/icon-512.png` with your own icons. These show up on the iOS home screen and in the PWA install flow.

- `icon-180.png` -- 180x180px, used by iOS Safari
- `icon-192.png` -- 192x192px, used by Android/PWA
- `icon-512.png` -- 512x512px, used by PWA splash screen

A simple dark square with "CS" or a credit card icon works fine.
