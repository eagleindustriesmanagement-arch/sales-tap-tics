-- Login with a one-time code (spec 18.1) and server-side login sessions. Codes and tokens are stored only as
-- hashes. Lookups that must cross tenants (who owns this email?) happen only inside security-definer functions.

create unique index users_active_email on users (lower(email)) where status = 'active' and email is not null;
create unique index users_active_phone on users (phone) where status = 'active' and phone is not null;

create table login_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index login_codes_user_created on login_codes (user_id, created_at desc);

create table auth_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['login_codes', 'auth_sessions'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($p$create policy tenant_isolation on %I using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id())$p$, t);
    execute format('create trigger %I_touch before update on %I for each row execute function app.touch()', t, t);
  end loop;
end $$;
grant select, insert, update, delete on login_codes, auth_sessions to app_user, app_worker;

-- Finds the active user for an email or phone. Internal to the functions below.
create or replace function app.login_user(p_identifier text) returns table (user_id uuid, tenant_id uuid)
language sql stable security definer set search_path = public as $$
  select u.id, u.tenant_id from users u
  where u.status = 'active'
    and (lower(u.email) = lower(trim(p_identifier)) or u.phone = regexp_replace(p_identifier, '[^0-9+]', '', 'g'))
  limit 1
$$;
revoke all on function app.login_user(text) from public;

-- Stores a code for the identifier. Returns 'sent', 'unknown' or 'rate_limited'. Callers answer 'unknown' and
-- 'sent' identically, so the endpoint does not reveal who has an account.
create or replace function app.auth_request_code(p_identifier text, p_code_hash text, p_ttl_seconds int, p_max_per_window int, p_window_seconds int)
returns table (status text, user_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  found record;
  recent int;
begin
  select * into found from app.login_user(p_identifier);
  if found.user_id is null then
    return query select 'unknown'::text, null::uuid;
    return;
  end if;
  select count(*) into recent from login_codes c where c.user_id = found.user_id and c.created_at > now() - make_interval(secs => p_window_seconds);
  if recent >= p_max_per_window then
    return query select 'rate_limited'::text, found.user_id;
    return;
  end if;
  insert into login_codes (tenant_id, user_id, code_hash, expires_at) values (found.tenant_id, found.user_id, p_code_hash, now() + make_interval(secs => p_ttl_seconds));
  return query select 'sent'::text, found.user_id;
end $$;

-- Checks a code against the newest live one. Returns 'ok', 'invalid', 'expired' or 'locked'.
create or replace function app.auth_verify_code(p_identifier text, p_code_hash text, p_max_attempts int)
returns table (status text, user_id uuid, tenant_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  found record;
  code record;
begin
  select * into found from app.login_user(p_identifier);
  if found.user_id is null then
    return query select 'invalid'::text, null::uuid, null::uuid;
    return;
  end if;
  select * into code from login_codes c where c.user_id = found.user_id and c.consumed_at is null order by c.created_at desc limit 1 for update;
  if code.id is null or code.expires_at < now() then
    return query select 'expired'::text, null::uuid, null::uuid;
    return;
  end if;
  if code.attempts >= p_max_attempts then
    return query select 'locked'::text, null::uuid, null::uuid;
    return;
  end if;
  if code.code_hash <> p_code_hash then
    update login_codes set attempts = attempts + 1 where id = code.id;
    return query select (case when code.attempts + 1 >= p_max_attempts then 'locked' else 'invalid' end)::text, null::uuid, null::uuid;
    return;
  end if;
  update login_codes set consumed_at = now() where id = code.id;
  return query select 'ok'::text, found.user_id, found.tenant_id;
end $$;

create or replace function app.auth_create_session(p_user_id uuid, p_token_hash text, p_ttl_seconds int) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
begin
  insert into auth_sessions (tenant_id, user_id, token_hash, expires_at)
  select u.tenant_id, u.id, p_token_hash, now() + make_interval(secs => p_ttl_seconds) from users u where u.id = p_user_id and u.status = 'active'
  returning id into sid;
  return sid;
end $$;

-- Resolves a session token to its user and tenant; refreshes last_seen. Nothing for an expired or revoked token.
create or replace function app.auth_resolve_session(p_token_hash text) returns table (session_id uuid, user_id uuid, tenant_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
    update auth_sessions s set last_seen_at = now()
    from users u
    where s.token_hash = p_token_hash and s.revoked_at is null and s.expires_at > now() and u.id = s.user_id and u.status = 'active'
    returning s.id, s.user_id, s.tenant_id;
end $$;

create or replace function app.auth_revoke_session(p_token_hash text) returns void
language sql security definer set search_path = public as $$
  update auth_sessions set revoked_at = now() where token_hash = p_token_hash and revoked_at is null
$$;

grant execute on function app.auth_request_code(text, text, int, int, int), app.auth_verify_code(text, text, int), app.auth_create_session(uuid, text, int), app.auth_resolve_session(text), app.auth_revoke_session(text) to app_user;
