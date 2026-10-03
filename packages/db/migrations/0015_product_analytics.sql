-- Spec 19.4, decision 0020: product analytics from the app's own tables, counts only. Two facts the tables did not
-- hold yet: whether the rep watched the demonstration before a session, and when the rep first saw its debrief.
alter table sessions add column demo_watched boolean;
alter table sessions add column debrief_seen_at timestamptz;

-- The store's usage since a date, for its general manager. Counts and averages only, never text or a person's
-- rows, so it includes sessions inside reps' private windows without revealing any one of them (spec 19.4: never
-- send transcript text to analytics). Anyone else gets null.
create or replace function app.store_usage(store uuid, since timestamptz)
returns jsonb
language sql stable security definer set search_path = public as $$
  with gm as (
    select 1 from memberships m where m.user_id = app.user_id() and m.store_id = store and m.role = 'general_manager'
  ),
  s as (
    select * from sessions
    where store_id = store and tenant_id = app.tenant_id() and started_at >= since and mode <> 'demo' and exists (select 1 from gm)
  ),
  reps as (
    select u.id, u.created_at from users u
    where u.tenant_id = app.tenant_id() and u.status = 'active' and exists (select 1 from gm)
      and exists (select 1 from memberships m where m.user_id = u.id and m.store_id = store and m.role = 'rep')
  ),
  firsts as (
    select r.id, r.created_at, (select min(x.started_at) from sessions x where x.user_id = r.id and x.mode <> 'demo') first_at from reps r
  ),
  cards as (
    select i.* from behavior_card_issues i
    where i.tenant_id = app.tenant_id() and i.issued_at >= since and exists (select 1 from gm)
      and exists (select 1 from memberships m where m.user_id = i.user_id and m.store_id = store)
  ),
  usage as (select u.* from model_usage u join s on s.id = u.session_id),
  days as (select greatest(1, ceil(extract(epoch from now() - since) / 86400))::numeric n)
  select case when not exists (select 1 from gm) then null else jsonb_build_object(
    'sessions_started', (select count(*) from s),
    'sessions_completed', (select count(*) from s where end_reason is not null and end_reason <> 'abandoned'),
    'voice_sessions', (select count(*) from s where not text_mode),
    'reps', (select count(*) from reps),
    'active_reps_today', (select count(distinct user_id) from s where (started_at at time zone 'America/New_York')::date = (now() at time zone 'America/New_York')::date),
    'active_reps_7d', (select count(distinct user_id) from s where started_at >= now() - interval '7 days'),
    'avg_daily_active_reps', (select round(count(*) / (select n from days), 2) from (select distinct user_id, (started_at at time zone 'America/New_York')::date from s) d),
    'median_hours_to_first_session', (select round(percentile_cont(0.5) within group (order by extract(epoch from first_at - created_at) / 3600)::numeric, 1) from firsts where first_at is not null),
    'reps_never_practiced', (select count(*) from firsts where first_at is null),
    'debriefs_seen', (select count(*) from s where debrief_seen_at is not null),
    'demo_watched', (select count(*) from s where demo_watched),
    'demo_skipped', (select count(*) from s where demo_watched = false),
    'cards_issued', (select count(*) from cards),
    'cards_checked', (select count(*) from cards where status = 'checked'),
    'asr_confidence', (select coalesce(jsonb_object_agg(language, c), '{}'::jsonb) from (
      select s.language, round(avg(t.asr_confidence)::numeric, 3) c from turns t join s on s.id = t.session_id
      where t.speaker = 'rep' and t.asr_confidence is not null group by s.language) a),
    'pause_ms_median', (select round(percentile_cont(0.5) within group (order by t.pause_before_ms)::numeric) from turns t join s on s.id = t.session_id where t.speaker = 'rep' and t.pause_before_ms is not null),
    'model_cost_per_session', (select round(sum(cost_usd) / nullif(count(distinct session_id), 0), 4) from usage),
    'latency_ms', (select coalesce(jsonb_object_agg(purpose, jsonb_build_object('median', p50, 'first_token', ft, 'calls', n)), '{}'::jsonb) from (
      select purpose, round(percentile_cont(0.5) within group (order by latency_ms)::numeric) p50,
             round((percentile_cont(0.5) within group (order by first_token_ms))::numeric) ft, count(*) n
      from usage group by purpose) l),
    'weeks', (select coalesce(jsonb_agg(w order by w->>'week'), '[]'::jsonb) from (
      select jsonb_build_object('week', to_char(date_trunc('week', started_at at time zone 'America/New_York'), 'YYYY-MM-DD'),
             'started', count(*), 'completed', count(*) filter (where end_reason is not null and end_reason <> 'abandoned'),
             'active_reps', count(distinct user_id)) w
      from s group by date_trunc('week', started_at at time zone 'America/New_York')) wk)
  ) end
$$;
revoke all on function app.store_usage(uuid, timestamptz) from public;
grant execute on function app.store_usage(uuid, timestamptz) to app_user, app_worker;
