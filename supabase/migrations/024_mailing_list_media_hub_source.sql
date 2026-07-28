-- ============================================================
-- MIGRATION 024 — Capture Media Hub gallery-unlock emails
-- K&P Website · Run this AFTER migration 023
-- ============================================================
-- Problem this fixes: when a visitor enters their email to unlock the
-- photo gallery on /media-hub (EmailGate in MediaHubPage.jsx), the email
-- was only written to `media_downloads` — a table with no admin UI at all.
-- Those signups never reached `mailing_list`, so they were invisible in
-- the admin dashboard's Mailing List tab.
--
-- Three schema changes are needed before the frontend can write them:
--   1. `source` only allowed ('manual', 'humanitix') — add 'media_hub'.
--   2. first_name / last_name are NOT NULL, but the gallery gate only
--      collects an email. Make them nullable rather than inventing fake
--      placeholder names that would pollute the CSV export.
--   3. mailing_list has no anon INSERT policy (migration 018/020 left it
--      admin-only), so an anonymous visitor's insert is rejected by RLS.
--
-- Safe to re-run — every statement below is guarded.


-- ── 1. Allow the new source value ─────────────────────────────
-- The constraint was created inline in migration 013, so Postgres
-- auto-named it `mailing_list_source_check`.

alter table mailing_list
  drop constraint if exists mailing_list_source_check;

alter table mailing_list
  add constraint mailing_list_source_check
  check (source in ('manual', 'humanitix', 'media_hub'));


-- ── 2. Names become optional ──────────────────────────────────
-- The gallery gate collects an email only. The admin "Add Contact" form
-- still requires both names client-side, so manual entry is unaffected.

alter table mailing_list alter column first_name drop not null;
alter table mailing_list alter column last_name  drop not null;


-- ── 3. Tightly-scoped anonymous INSERT policy ─────────────────
-- Anonymous visitors may create exactly one kind of row: their own
-- self-serve media-hub signup. The WITH CHECK predicate makes it
-- impossible to forge a 'manual' or 'humanitix' row, or to write an
-- already-unsubscribed record. No anon SELECT / UPDATE / DELETE policy
-- is granted, so visitors can neither read the list back nor modify
-- anyone else's entry — the admin-only policy from migration 020
-- remains the only way to do that.
--
-- Note: because anon has no UPDATE right, the client CANNOT use
-- .upsert() here. A repeat visitor's insert will fail the unique index
-- on lower(email) with SQLSTATE 23505; MediaHubPage.jsx treats that
-- specific code as a harmless no-op (they're already subscribed).

drop policy if exists "Public can join mailing list from media hub" on mailing_list;
create policy "Public can join mailing list from media hub"
  on mailing_list for insert
  to anon, authenticated
  with check (source = 'media_hub' and subscribed = true);


-- ── Verify ────────────────────────────────────────────────────
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint where conrelid = 'mailing_list'::regclass;
-- select policyname, cmd, with_check
--   from pg_policies where tablename = 'mailing_list';
