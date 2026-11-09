-- Run in Supabase: SQL Editor > New query > Run
create table if not exists animals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users on delete cascade,
  tag text not null, name text not null, type text, age numeric, breed text,
  gender text, weight numeric, location text, vaccine text, next_vaccine date,
  status text default 'Healthy', temp numeric, feed text,
  history jsonb default '[]', created_at timestamptz default now()
);
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users on delete cascade,
  animal_tag text, disease text, risk text, message text,
  read boolean default false, created_at timestamptz default now()
);
alter table animals enable row level security;
alter table alerts enable row level security;
create policy "own animals" on animals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own alerts" on alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Tip: for quick demos disable "Confirm email" in Authentication > Providers > Email.
