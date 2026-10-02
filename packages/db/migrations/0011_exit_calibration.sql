-- Spec 19.2 item 1, decision 0011: one exit-rate multiplier per store and month, and the multiplier each practice
-- session ran under, so each month's calibration compares like with like.
alter table sessions add column exit_multiplier numeric(5, 2) not null default 1 check (exit_multiplier > 0);

create table store_calibrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  store_id uuid not null references stores(id),
  kind text not null check (kind in ('exit_rates')),
  month date not null check (extract(day from month) = 1),
  value jsonb not null,
  computed_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, kind, month)
);
create trigger store_calibrations_touch before update on store_calibrations for each row execute function app.touch();

alter table store_calibrations enable row level security;
alter table store_calibrations force row level security;
create policy tenant_isolation on store_calibrations using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id());
-- Everyone in the store reads it (a session start needs the multiplier); only the general manager writes it.
create policy store_calibrations_read on store_calibrations as restrictive for select to app_user
  using (exists (select 1 from memberships m where m.user_id = app.user_id() and m.store_id = store_calibrations.store_id));
create policy store_calibrations_insert on store_calibrations as restrictive for insert to app_user
  with check (app.has_role('general_manager') and computed_by = app.user_id());
create policy store_calibrations_update on store_calibrations as restrictive for update to app_user
  using (app.has_role('general_manager')) with check (app.has_role('general_manager') and computed_by = app.user_id());
create policy store_calibrations_delete on store_calibrations as restrictive for delete to app_user using (false);
grant select, insert, update on store_calibrations to app_user;
grant select, insert, update, delete on store_calibrations to app_worker;

-- Counts only, never rows: the general manager's calibration needs every practice session in the store, including
-- the ones still inside a rep's private window, and learns nothing about any one session.
create or replace function app.store_exit_counts(store uuid, since timestamptz, multiplier numeric)
returns table (sessions int, exits int)
language sql stable security definer set search_path = public as $$
  select count(*)::int, count(*) filter (where s.end_reason in ('walk_away', 'not_now'))::int
  from sessions s
  where s.store_id = store and s.tenant_id = app.tenant_id() and s.mode = 'practice' and s.started_at >= since
    and s.exit_multiplier = multiplier and s.end_reason is not null and s.end_reason <> 'abandoned'
    and exists (select 1 from memberships m where m.user_id = app.user_id() and m.store_id = store and m.role = 'general_manager')
$$;
revoke all on function app.store_exit_counts(uuid, timestamptz, numeric) from public;
grant execute on function app.store_exit_counts(uuid, timestamptz, numeric) to app_user, app_worker;
