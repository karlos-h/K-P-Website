-- ============================================================
-- MIGRATION 013 — Mailing list (event contacts), manual entry
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- Phase 1: manual CRUD only, via the Admin Dashboard "Mailing List" tab.
-- `source` and nullable `event_title` are designed so a future Phase 2
-- (Humanitix sync via a server-side integration) can insert rows with
-- source = 'humanitix' without any schema change.

create table if not exists mailing_list (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  source text not null default 'manual' check (source in ('manual', 'humanitix')),
  event_title text,
  subscribed boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists mailing_list_email_lower_idx
  on mailing_list (lower(email));

alter table mailing_list enable row level security;

drop policy if exists "Admin manages mailing_list" on mailing_list;
create policy "Admin manages mailing_list"
  on mailing_list for all using (auth.role() = 'authenticated');
