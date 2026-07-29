-- ============================================================
-- MIGRATION 035 — Scheduled cleanup of orphaned Crowd POV uploads
-- K&P Website · Run this AFTER migration 034
-- ============================================================
-- The problem: CrowdPovModal uploads the visitor's photo to
-- crowd-pov-pending BEFORE inserting the crowd_submissions row, because
-- the reverse order would leave the admin review queue showing
-- submissions whose file never arrived. Anything failing between those
-- two steps strands a file that nothing references. Migration 034's RPC
-- removes the common cause (hitting the submission cap), but a client
-- can always skip that check, so something still has to sweep up.
--
-- ── Why this can't be a plain pg_cron job ────────────────────
-- Supabase installs a `storage.protect_delete()` trigger that rejects
-- `delete from storage.objects` outright. It does have an escape hatch
-- (`set storage.allow_delete_query = 'true'`), but taking it would be a
-- mistake, not a shortcut: it removes the metadata row while leaving the
-- actual bytes in the storage backend, turning a visible orphan into an
-- invisible one. That is exactly what the trigger's own hint warns
-- about. Real deletion has to go through the Storage API.
--
-- So the shape is: pg_cron → pg_net → the `crowd-pov-cleanup` Edge
-- Function, which holds service-role credentials supplied by the Edge
-- runtime and calls the Storage API properly. This is Supabase's current
-- documented pattern for scheduling an Edge Function
-- (https://supabase.com/docs/guides/functions/schedule-functions).
--
-- ── Why a Vault token rather than the service-role key ───────
-- The documented pattern authenticates the cron→function hop with a key
-- read from Vault. Rather than store the service-role key (a credential
-- that can do anything, and would have to be pasted in by hand), this
-- generates a random token that is good for exactly one thing: invoking
-- this cleanup. It is generated inside the database, so the plaintext
-- never appears in this file, in git, or in an environment variable.
-- The Edge Function reads it back via crowd_pov_cleanup_token() using
-- the service-role credentials it already has.
--
-- Safe to re-run — the secret is only generated when absent, and the
-- cron job is unscheduled before being re-created.


-- ── 1. Extensions ─────────────────────────────────────────────
-- Install into `extensions`, alongside pgcrypto and uuid-ossp. Creating
-- it without an explicit schema puts it in `public`, which trips the
-- security advisor's extension_in_public lint. pg_net does not support
-- ALTER EXTENSION ... SET SCHEMA, so getting this wrong means a drop and
-- recreate — worth getting right the first time.
--
-- Note on exposure: pg_net's functions live in a `net` schema that the
-- extension creates for itself, regardless of the clause above. Postgres
-- grants EXECUTE on them to PUBLIC by default and anon does hold USAGE
-- on `net`, so on paper anon can execute net.http_post — an HTTP client
-- reachable by anon would be a server-side request forgery primitive.
-- In practice it is not reachable: PostgREST only exposes `public`, so
-- /rest/v1/rpc/http_post 404s (verified). It cannot be tightened from
-- here either — those grants were made by `supabase_admin`, and only the
-- grantor can revoke them, while migrations run as `postgres`. This is
-- Supabase's default posture for pg_net rather than something this
-- project chose. Do not add a `public` wrapper around any net.* function.

create extension if not exists pg_net with schema extensions;


-- ── 2. Shared token, generated in-database ────────────────────
-- gen_random_bytes comes from pgcrypto, which Supabase installs into the
-- `extensions` schema.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'crowd_pov_cleanup_token') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'crowd_pov_cleanup_token',
      'Shared secret the hourly crowd-pov-cleanup cron job presents to the Edge Function of the same name.'
    );
  end if;
end;
$$;


-- ── 3. Token accessor for the Edge Function ───────────────────
-- Lives in `public` because that is the only schema PostgREST exposes,
-- so it is the only place an Edge Function can reach by RPC. Execute is
-- granted to service_role alone — a role that already has unrestricted
-- database access, so this grants it nothing new. anon and authenticated
-- explicitly cannot call it.

create or replace function public.crowd_pov_cleanup_token()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'crowd_pov_cleanup_token';
$$;

revoke all on function public.crowd_pov_cleanup_token() from public, anon, authenticated;
grant execute on function public.crowd_pov_cleanup_token() to service_role;


-- ── 4. The orphan query ───────────────────────────────────────
-- Done in SQL rather than the Edge Function because the database can see
-- storage.objects and crowd_submissions together, which turns the whole
-- question into one join instead of paging the Storage list API and
-- reconciling it client-side. The function only ever looks at
-- crowd-pov-pending — never the public crowd-pov bucket, where approved
-- photos live.
--
-- The age floor matters: a legitimate upload has no crowd_submissions
-- row for the moment between the upload finishing and the insert
-- landing. Anything younger than the threshold is assumed to be a
-- submission still in flight.

create or replace function public.crowd_pov_orphans(p_older_than_minutes integer default 60)
returns table (path text)
language sql
security definer
set search_path = public
stable
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'crowd-pov-pending'
    and o.created_at < now() - (greatest(p_older_than_minutes, 0) * interval '1 minute')
    and not exists (
      select 1 from crowd_submissions s where s.storage_path = o.name
    );
$$;

revoke all on function public.crowd_pov_orphans(integer) from public, anon, authenticated;
grant execute on function public.crowd_pov_orphans(integer) to service_role;


-- ── 5. Schedule it hourly ─────────────────────────────────────
-- At :23 past, deliberately offset from update-past-event-status at :07
-- (migration 025) so the two never contend. cron.unschedule() throws if
-- the job is absent, so guard on the catalog the same way 025 does.
--
-- The job sends no body: the Edge Function defaults to a 60-minute age
-- threshold, and accepts older_than_minutes only so the sweep can be
-- exercised on demand without waiting an hour.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'crowd-pov-cleanup') then
    perform cron.unschedule('crowd-pov-cleanup');
  end if;
end;
$$;

select cron.schedule(
  'crowd-pov-cleanup',
  '23 * * * *',
  $$
  select net.http_post(
    url     := 'https://nmgcvbqampivxxrzfstz.supabase.co/functions/v1/crowd-pov-cleanup',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-cleanup-token', (select decrypted_secret from vault.decrypted_secrets
                          where name = 'crowd_pov_cleanup_token')
    ),
    body    := '{}'::jsonb
  );
  $$
);


-- ── Verify ────────────────────────────────────────────────────
-- select jobid, jobname, schedule, active from cron.job
--   where jobname = 'crowd-pov-cleanup';
--
-- Orphans the next sweep would remove (empty is the healthy state):
-- select * from public.crowd_pov_orphans(60);
--
-- Recent runs, once an hour has elapsed:
-- select status, return_message, start_time from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'crowd-pov-cleanup')
--   order by start_time desc limit 5;
--
-- Delivery outcome of those runs (pg_net logs responses separately):
-- select id, status_code, content from net._http_response order by id desc limit 5;
