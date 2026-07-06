-- ============================================================
-- MIGRATION 008 — Add sort_date to events
-- K&P Website · Safe to re-run (guarded with IF NOT EXISTS)
-- ============================================================
-- sort_date is a real DATE column used only for reliable
-- "has this event passed?" logic. The existing `date` text
-- column is kept as-is (free-text display label).

alter table events
  add column if not exists sort_date date;

-- Best-effort backfill: try to cast the free-text date column
-- to a real date. Rows where the cast fails are silently left
-- as null — we never want to fail the migration over an
-- unparseable historical label like "January 2025".
do $$
declare
  r record;
  parsed date;
begin
  for r in select id, date from events where sort_date is null and date is not null loop
    begin
      parsed := r.date::date;
      update events set sort_date = parsed where id = r.id;
    exception when others then
      -- unparseable — leave sort_date null
      null;
    end;
  end loop;
end $$;
