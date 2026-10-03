-- A dealership signs itself up (decision 0029): store name and work email, then the emailed six-digit code. The
-- verified code creates the tenant, its first store with default (strictest) policies, and the owner as the
-- store's general manager, in one transaction. Pending sign-ups are touched only by the security-definer
-- functions below: no role is granted the table, and row-level security with no policy denies everything else.

create table signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  store_name text not null check (length(store_name) between 2 and 120),
  first_name text check (first_name is null or length(first_name) between 1 and 60),
  language text not null default 'en' check (language in ('en', 'es')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  tenant_id uuid references tenants(id),
  created_at timestamptz not null default now()
);
create index signups_email_created on signups (lower(email), created_at desc);
alter table signups enable row level security;
revoke all on signups from public;

-- Stores a pending sign-up. Returns 'sent', 'exists' (an active account already uses the email: the caller sends an
-- ordinary sign-in code instead and answers the same way) or 'rate_limited'.
create or replace function app.signup_request(p_email text, p_store_name text, p_first_name text, p_language text, p_code_hash text, p_ttl_seconds int, p_max_per_window int, p_window_seconds int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  if exists (select 1 from users u where u.status = 'active' and lower(u.email) = lower(trim(p_email))) then
    return 'exists';
  end if;
  select count(*) into recent from signups s where lower(s.email) = lower(trim(p_email)) and s.created_at > now() - make_interval(secs => p_window_seconds);
  if recent >= p_max_per_window then
    return 'rate_limited';
  end if;
  insert into signups (email, store_name, first_name, language, code_hash, expires_at)
  values (lower(trim(p_email)), trim(p_store_name), nullif(trim(coalesce(p_first_name, '')), ''), p_language, p_code_hash, now() + make_interval(secs => p_ttl_seconds));
  return 'sent';
end $$;

-- Checks the code against the newest pending sign-up for the email. Returns 'ok' with the new user and tenant, or
-- 'none' (no pending sign-up: the caller tries an ordinary sign-in code), 'invalid', 'expired' or 'locked'.
create or replace function app.signup_verify(p_email text, p_code_hash text, p_max_attempts int)
returns table (status text, user_id uuid, tenant_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  s record;
  t_id uuid;
  st_id uuid;
  u_id uuid;
begin
  select * into s from signups x where lower(x.email) = lower(trim(p_email)) and x.consumed_at is null order by x.created_at desc limit 1 for update;
  if s.id is null then
    return query select 'none'::text, null::uuid, null::uuid;
    return;
  end if;
  if s.expires_at < now() then
    return query select 'expired'::text, null::uuid, null::uuid;
    return;
  end if;
  if s.attempts >= p_max_attempts then
    return query select 'locked'::text, null::uuid, null::uuid;
    return;
  end if;
  if s.code_hash <> p_code_hash then
    update signups set attempts = attempts + 1 where id = s.id;
    return query select (case when s.attempts + 1 >= p_max_attempts then 'locked' else 'invalid' end)::text, null::uuid, null::uuid;
    return;
  end if;
  -- Someone finished signing up with this email in the meantime: the code is spent, nothing new is created.
  if exists (select 1 from users u where u.status = 'active' and lower(u.email) = lower(s.email)) then
    update signups set consumed_at = now() where id = s.id;
    return query select 'none'::text, null::uuid, null::uuid;
    return;
  end if;
  insert into tenants (name, default_language) values (s.store_name, s.language) returning id into t_id;
  insert into stores (tenant_id, name) values (t_id, s.store_name) returning id into st_id;
  insert into store_policies (tenant_id, store_id) values (t_id, st_id);
  insert into users (tenant_id, first_name, email, preferred_language) values (t_id, s.first_name, s.email, s.language) returning id into u_id;
  insert into memberships (tenant_id, user_id, store_id, role) values (t_id, u_id, st_id, 'general_manager');
  insert into audit_log (tenant_id, actor_id, action, target_type, target_id, detail)
  values (t_id, u_id, 'tenant.signup', 'store', st_id, jsonb_build_object('store', s.store_name));
  update signups set consumed_at = now(), tenant_id = t_id where id = s.id;
  return query select 'ok'::text, u_id, t_id;
end $$;

revoke all on function app.signup_request(text, text, text, text, text, int, int, int), app.signup_verify(text, text, int) from public;
grant execute on function app.signup_request(text, text, text, text, text, int, int, int), app.signup_verify(text, text, int) to app_user;
