-- B Planner — embedded email taste profiles from email-travel-parser

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists email_taste_profiles (
  id                    uuid primary key default gen_random_uuid(),
  session_id            text not null,
  email                 text,
  source                text not null default 'email-travel-parser'
                        check (source in ('email-travel-parser', 'manual', 'imported')),
  profile_text          text not null,
  profile_json          jsonb not null default '{}',
  categories            jsonb not null default '[]',
  embedding             vector(1536),
  embedding_model       text,
  embedding_dimensions  integer not null default 1536 check (embedding_dimensions = 1536),
  evidence              jsonb not null default '[]',
  generated_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (session_id)
);

create index if not exists idx_email_taste_profiles_session_id
  on email_taste_profiles (session_id);

create index if not exists idx_email_taste_profiles_embedding
  on email_taste_profiles
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

alter table email_taste_profiles enable row level security;

create policy "anon_own_email_taste_profiles" on email_taste_profiles
  for all
  using (true)
  with check (true);
