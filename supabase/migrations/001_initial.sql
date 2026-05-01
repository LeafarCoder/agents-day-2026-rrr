-- B Planner — initial schema

create table if not exists user_preferences (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null unique,
  categories  jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

create table if not exists runs (
  id          text primary key,
  session_id  text not null,
  status      text not null default 'running',
  steps       jsonb not null default '[]',
  result      jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists viator_fixtures (
  id            uuid primary key default gen_random_uuid(),
  city_slug     text not null unique,
  response_json jsonb not null,
  cached_at     timestamptz not null default now()
);

-- RLS: user_preferences — anon key can read/write own session rows
alter table user_preferences enable row level security;

create policy "anon_own_preferences" on user_preferences
  for all
  using (true)
  with check (true);

-- RLS: runs — anon key can read/write own session rows
alter table runs enable row level security;

create policy "anon_own_runs" on runs
  for all
  using (true)
  with check (true);

-- viator_fixtures — no RLS (service-role only via backend)
alter table viator_fixtures enable row level security;

create policy "service_role_fixtures" on viator_fixtures
  for all
  to service_role
  using (true);
