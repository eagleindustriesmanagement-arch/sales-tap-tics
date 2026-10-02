-- Spec 19.1: the store's own outcome data, imported by CSV in release 1 (the CRM and DMS connect in release 2).
-- One row per kind, month, rep (when the kind is per rep) and dimension (lost-deal reason, lead channel).
-- A matched rep is keyed by person, so "Luis" and his email are the same row; an unmatched rep by the label as written.
create table store_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  store_id uuid not null references stores(id),
  kind text not null check (kind in ('ups', 'lost_reasons', 'be_backs', 'leads', 'addons')),
  month date not null check (extract(day from month) = 1),
  rep_user_id uuid references users(id),
  rep_label text,
  dimension text not null default '',
  metrics jsonb not null,
  imported_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index store_metrics_key on store_metrics (store_id, kind, month, coalesce(rep_user_id::text, lower(rep_label), ''), dimension);
create trigger store_metrics_touch before update on store_metrics for each row execute function app.touch();

alter table store_metrics enable row level security;
alter table store_metrics force row level security;
create policy tenant_isolation on store_metrics using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id());
create policy store_metrics_gm on store_metrics as restrictive to app_user using (app.has_role('general_manager')) with check (app.has_role('general_manager') and imported_by = app.user_id());
grant select, insert, update, delete on store_metrics to app_user, app_worker;
