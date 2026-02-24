-- =============================================================
-- Prompt 5.2 — waitlist_users table
-- Run this in the Supabase SQL Editor
-- =============================================================

create table if not exists waitlist_users (
  id            uuid        primary key default gen_random_uuid(),
  full_name     text        not null,
  email         text        not null,
  role          text        not null check (role in ('seeker', 'provider')),
  organization  text        null,
  message       text        null,
  source        text        not null default 'website',
  -- Prompt 5.5 — export-friendly fields
  status        text        not null default 'new',
  notes         text        null,
  created_at    timestamptz not null default now(),

  -- organization required when role = provider
  constraint provider_requires_org check (
    role <> 'provider' or (organization is not null and trim(organization) <> '')
  )
);

-- Indexes
create index if not exists waitlist_users_created_at_idx on waitlist_users (created_at desc);
create unique index if not exists waitlist_users_email_idx on waitlist_users (lower(email));

-- =============================================================
-- Prompt 5.3 — RLS + insert policy
-- =============================================================

alter table waitlist_users enable row level security;

-- Allow public (anon) inserts only — no reads, no updates, no deletes
create policy "anon_insert_waitlist"
  on waitlist_users
  for insert
  to anon
  with check (true);

-- (Optional) Authenticated users can read all rows (for future admin)
-- Uncomment when you add an admin role:
-- create policy "authenticated_select_waitlist"
--   on waitlist_users
--   for select
--   to authenticated
--   using (true);
