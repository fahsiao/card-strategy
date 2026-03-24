-- Run this in your Supabase dashboard > SQL Editor
-- Creates the balances table and enables real-time sync

-- 1. Create the table
create table if not exists public.balances (
  id text primary key,
  label text not null,
  value integer default 0,
  color text,
  is_system boolean default false,
  updated_at timestamptz,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security (but allow all access via anon key)
-- Since this is a private app with no auth, we allow full access.
-- If you add auth later, replace these with proper user-scoped policies.
alter table public.balances enable row level security;

create policy "Allow all reads" on public.balances
  for select using (true);

create policy "Allow all inserts" on public.balances
  for insert with check (true);

create policy "Allow all updates" on public.balances
  for update using (true);

create policy "Allow all deletes" on public.balances
  for delete using (true);

-- 3. Enable real-time on the table
alter publication supabase_realtime add table public.balances;

-- 4. Create turns tracking table
create table if not exists public.turns (
  id bigint generated always as identity primary key,
  bucket text not null,  -- 'costco' or 'meals'
  person text not null,  -- 'Eric' or 'Christine'
  paid_at timestamptz default now()
);

-- 5. RLS for turns
alter table public.turns enable row level security;

create policy "Allow all reads on turns" on public.turns
  for select using (true);

create policy "Allow all inserts on turns" on public.turns
  for insert with check (true);

create policy "Allow all deletes on turns" on public.turns
  for delete using (true);

-- 6. Enable real-time on turns
alter publication supabase_realtime add table public.turns;

-- 7. Seed default balances
insert into public.balances (id, label, value, color, is_system) values
  ('ur-e', 'Chase UR (Eric CSR)', 0, '#5B9BD5', true),
  ('ur-c', 'Chase UR (Christine CSP + Freedom)', 0, '#5B9BD5', true),
  ('mr', 'AMEX MR (Gold)', 0, '#D4A840', true)
on conflict (id) do nothing;
