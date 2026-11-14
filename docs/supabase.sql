-- Optional backend for contributions (Fase 3 – Prompt 2). NOT deployed.
-- The front only uses it if src/config.local.js (git-ignored) has SUPABASE_URL and SUPABASE_ANON_KEY.
-- Insert-only for the public (anon) role: anyone can read and add, nobody can edit or delete via the API.

create table if not exists public.contributions (
  id          text primary key,
  nickname    text not null check (char_length(nickname) between 3 and 20),
  created_at  timestamptz not null default now(),
  payload     jsonb not null
);

alter table public.contributions enable row level security;

create policy "public read"   on public.contributions for select to anon using (true);
create policy "public insert" on public.contributions for insert to anon with check (
  char_length(nickname) between 3 and 20
  and payload ? 'score' and payload ? 'status'
  and (payload->>'status') in ('auto-checked', 'needs-review')   -- the public can never insert 'team-confirmed'
);
-- No update / delete policies → denied for anon. Team confirmation stays local (admin mode) or is done with the service role.
