-- Sales Tap-tics schema (spec 6). Money in integer cents, times in UTC (timestamptz), every tenant table carries
-- tenant_id and row-level security keyed on the request's tenant (spec 3.3 rule 2).
--
-- The application connects as role app_user (no BYPASSRLS) and, inside each transaction, sets:
--   set_config('app.tenant_id', <uuid>, true)   set_config('app.user_id', <uuid>, true)
-- The post-session worker connects as app_worker: same tenant isolation, no per-user visibility limits.

create extension if not exists pgcrypto;
create schema if not exists app;

-- ---------------------------------------------------------------- request context

create or replace function app.tenant_id() returns uuid language sql stable as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

create or replace function app.user_id() returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function app.immutable() returns trigger language plpgsql as $$
begin
  raise exception '% rows are immutable (spec 6.4)', tg_table_name using errcode = 'check_violation';
end $$;

-- ---------------------------------------------------------------- tenant and people (spec 6.1)

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'pilot',
  status text not null default 'active' check (status in ('active', 'suspended', 'ended')),
  default_language text not null default 'en' check (default_language in ('en', 'es')),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- A tenant row is its own tenant: tenant_id = id keeps the RLS policy uniform.
alter table tenants add column tenant_id uuid generated always as (id) stored;

create table stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  address text,
  timezone text not null default 'America/New_York',
  brands text[] not null default '{}',
  settings jsonb not null default '{}'::jsonb,
  live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  store_id uuid not null references stores(id),
  name text not null,
  kind text not null check (kind in ('new', 'used', 'bdc', 'finance', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  auth_id text unique,
  -- Personal data: never sent to a model (spec 5.3, 20.2). Sessions use a pseudonymous id instead.
  first_name text,
  last_name text,
  email text,
  phone text,
  pseudonym uuid not null default gen_random_uuid(),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'es')),
  spanish_register text not null default 'usted' check (spanish_register in ('usted', 'tu')),
  hire_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'anonymized')),
  reminder_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  store_id uuid not null references stores(id),
  team_id uuid references teams(id),
  role text not null check (role in ('rep', 'bdc_agent', 'manager', 'general_manager', 'content_editor', 'compliance_reviewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, store_id, role, team_id)
);

create table store_fees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  store_id uuid not null references stores(id),
  code text not null,
  name_en text not null,
  name_es text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  kind text not null check (kind in ('dealer_mandatory', 'government_customer_pays', 'optional')),
  effective_from date not null default current_date,
  approved_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table store_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  store_id uuid not null unique references stores(id),
  -- Strictest until the attorney confirms (spec 4.5).
  add_on_removal text not null default 'none_configured' check (add_on_removal in ('credit_price', 'show_alternative', 'none_configured')),
  referral_reward text not null default 'none' check (referral_reward in ('none', 'gift', 'cash')),
  text_consent_text_en text,
  text_consent_text_es text,
  private_window_hours int not null default 24 check (private_window_hours between 0 and 72),
  stop_on_critical boolean not null default true,
  audio_retention_days int not null default 180 check (audio_retention_days between 30 and 365),
  peak_hours jsonb not null default '[{"day": 6, "from": "11:00", "to": "17:00"}]'::jsonb,
  require_certification_for_ups boolean not null default true,
  walk_in_metric text not null default 'all_logged_ups' check (walk_in_metric in ('all_logged_ups', 'qualified_ups')),
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table store_lenders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  store_id uuid not null references stores(id),
  name text not null,
  is_credit_acceptance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- content (spec 6.2)

-- Platform releases have tenant_id null and are readable by every tenant. Each item is the validated YAML body;
-- the Zod schemas in packages/content are the one definition of its fields (decision 0007).
create table content_releases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  version text not null,
  scope text not null check (scope in ('platform', 'tenant', 'store')),
  scope_id uuid,
  published_by uuid,
  published_at timestamptz not null default now(),
  changelog text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'platform') = (tenant_id is null))
);

create table content_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  release_id uuid not null references content_releases(id),
  kind text not null check (kind in ('technique', 'objection', 'persona', 'scenario', 'rubric', 'rule', 'glossary', 'behavior_card', 'module', 'lexicon')),
  code text not null,
  body jsonb not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (release_id, kind, code)
);
create trigger content_items_immutable before update or delete on content_items for each row execute function app.immutable();

-- ---------------------------------------------------------------- practice activity (spec 6.3)

create table consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  version text not null,
  language text not null check (language in ('en', 'es')),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, version)
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  module_code text,
  scenario_code text,
  assigned_by uuid not null references users(id),
  due_at timestamptz,
  reason text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (module_code is not null or scenario_code is not null)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  store_id uuid not null references stores(id),
  scenario_code text not null,
  release_id uuid references content_releases(id),
  language text not null check (language in ('en', 'es')),
  mode text not null check (mode in ('demo', 'practice', 'certification', 'warm_up', 'customer_prep')),
  channel text not null check (channel in ('floor', 'phone', 'text')),
  text_mode boolean not null default false,
  seed text not null,
  exit_draw double precision,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text check (end_reason in ('sale', 'next_step', 'walk_away', 'not_now', 'timeout', 'abandoned')),
  private_until timestamptz,
  audio_key text,
  audio_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_user_started on sessions (user_id, started_at desc);

create table turns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  session_id uuid not null references sessions(id),
  index int not null,
  speaker text not null check (speaker in ('rep', 'customer')),
  text text not null,
  language_detected text,
  started_ms int,
  ended_ms int,
  pause_before_ms int,
  words_per_minute real,
  volume_db_mean real,
  asr_confidence real,
  is_objection boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, index)
);

create table scenario_state_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  session_id uuid not null references sessions(id),
  turn_index int not null,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table violations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  session_id uuid not null references sessions(id),
  turn_index int,
  rule_code text not null,
  severity text not null check (severity in ('critical', 'major', 'minor')),
  span text not null,
  true_fact jsonb not null,
  layer text not null check (layer in ('deterministic', 'classifier')),
  uncertain boolean not null default false,
  confirmed_by_reviewer boolean,
  reviewed_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  session_id uuid not null unique references sessions(id),
  rubric_code text not null,
  total real not null,
  passed boolean not null,
  honesty_passed boolean not null,
  dimensions jsonb not null,
  items jsonb not null,
  judge_model text,
  judge_prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger scores_immutable before update or delete on scores for each row execute function app.immutable();

create table score_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  score_id uuid not null references scores(id),
  manager_id uuid not null references users(id),
  reason text not null check (length(reason) > 0),
  flag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table debriefs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  session_id uuid not null unique references sessions(id),
  body jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table behavior_card_issues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  card_code text not null,
  item_code text not null,
  session_id uuid references sessions(id),
  issued_at timestamptz not null default now(),
  due_week date not null,
  status text not null default 'open' check (status in ('open', 'checked', 'missed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, due_week)
);

create table floor_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  card_issue_id uuid not null references behavior_card_issues(id),
  manager_id uuid not null references users(id),
  checked_at timestamptz not null default now(),
  observed text not null check (observed in ('yes', 'partly', 'no')),
  note text,
  duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table manager_check_quality (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  floor_check_id uuid not null unique references floor_checks(id),
  script_followed boolean not null,
  specific_feedback boolean not null,
  time_to_feedback_hours real,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table certifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  module_code text not null,
  level int not null check (level between 1 and 3),
  earned_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm_outcomes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  store_id uuid not null references stores(id),
  user_id uuid references users(id),
  period date not null,
  metric text not null,
  value real not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table support_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  approved_by uuid not null references users(id),
  platform_admin text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at <= starts_at + interval '72 hours')
);

create table model_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  session_id uuid references sessions(id),
  purpose text not null,
  model text not null,
  prompt_version text not null,
  input_tokens int not null,
  output_tokens int not null,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd numeric(12, 6) not null,
  latency_ms int not null,
  first_token_ms int,
  ok boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  actor_id uuid,
  action text not null,
  target_type text not null,
  target_id uuid,
  at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger audit_log_append_only before update or delete on audit_log for each row execute function app.immutable();

-- ---------------------------------------------------------------- updated_at triggers

do $$
declare t text;
begin
  for t in select table_name from information_schema.columns
           where table_schema = 'public' and column_name = 'updated_at'
             and table_name not in ('content_items', 'scores', 'audit_log')
  loop
    execute format('create trigger %I_touch before update on %I for each row execute function app.touch()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- visibility helpers (run as owner: no RLS recursion)

-- Roles the current user holds in the stores where the target user is a member.
create or replace function app.can_view_user(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select target = app.user_id() or exists (
    select 1
    from memberships viewer
    join memberships subject on subject.store_id = viewer.store_id and subject.user_id = target
    where viewer.user_id = app.user_id()
      and viewer.tenant_id = app.tenant_id()
      and (viewer.role = 'general_manager'
           or (viewer.role = 'manager' and (viewer.team_id is null or viewer.team_id = subject.team_id)))
  )
$$;

-- Spec 3.3 rule 3 and 14.6: a rep always sees their own sessions; managers in scope see them after the private
-- window, never customer-prep sessions; compliance reviewers see flagged sessions after the window.
create or replace function app.can_view_session(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sessions s
    where s.id = sid and s.tenant_id = app.tenant_id()
      and (
        s.user_id = app.user_id()
        or (
          s.mode <> 'customer_prep'
          and (s.private_until is null or s.private_until <= now())
          and (
            app.can_view_user(s.user_id)
            or (exists (select 1 from memberships m where m.user_id = app.user_id() and m.role = 'compliance_reviewer' and m.store_id = s.store_id)
                and exists (select 1 from violations v where v.session_id = s.id))
          )
        )
      )
  )
$$;

-- ---------------------------------------------------------------- roles and row-level security

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then create role app_user nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'app_worker') then create role app_worker nologin; end if;
end $$;
grant usage on schema app to app_user, app_worker;
grant execute on all functions in schema app to app_user, app_worker;
grant select, insert, update, delete on all tables in schema public to app_user, app_worker;

do $$
declare t text;
begin
  for t in select table_name from information_schema.columns
           where table_schema = 'public' and column_name = 'tenant_id'
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    if t in ('content_releases', 'content_items') then
      execute format($p$create policy tenant_isolation on %I using (tenant_id is null or tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id())$p$, t);
    else
      execute format($p$create policy tenant_isolation on %I using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id())$p$, t);
    end if;
  end loop;
end $$;

-- Per-user visibility, layered on tenant isolation for the app (the worker sees the whole tenant).
create policy session_visibility on sessions as restrictive for select to app_user using (app.can_view_session(id));
create policy session_insert_self on sessions as restrictive for insert to app_user with check (user_id = app.user_id());
create policy turn_visibility on turns as restrictive for select to app_user using (app.can_view_session(session_id));
create policy event_visibility on scenario_state_events as restrictive for select to app_user using (app.can_view_session(session_id));
create policy violation_visibility on violations as restrictive for select to app_user using (app.can_view_session(session_id));
create policy score_visibility on scores as restrictive for select to app_user using (app.can_view_session(session_id));
create policy debrief_visibility on debriefs as restrictive for select to app_user using (app.can_view_session(session_id));
create policy card_visibility on behavior_card_issues as restrictive for select to app_user using (app.can_view_user(user_id));
create policy user_visibility on users as restrictive for select to app_user using (app.can_view_user(id) or exists (select 1 from memberships m where m.user_id = app.user_id() and m.role in ('general_manager', 'content_editor', 'compliance_reviewer')));
-- A manager's automated score is never edited (spec 3.3 rule 4): overrides are separate rows, written by managers.
create policy override_by_manager on score_overrides as restrictive for insert to app_user with check (manager_id = app.user_id() and exists (select 1 from scores sc where sc.id = score_id and app.can_view_session(sc.session_id)));
