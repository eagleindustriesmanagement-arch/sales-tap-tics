-- Teams and individuals (decision 0032). Two ways in, both real:
--   * a manager signs up a team: they become its manager with admin access, and send invite links;
--   * an individual signs up alone, for any high-ticket sale, tied to no dealership.
-- Admin access (what was the general manager role) is a privilege any member can be given: it is stored as the
-- existing 'general_manager' membership, so every access rule keeps working, and the app presents it as a switch.

alter table tenants add column kind text not null default 'team' check (kind in ('team', 'individual'));
alter table tenants add column industry text not null default 'cars' check (industry in ('cars', 'homes', 'solar', 'furniture', 'other'));

-- Invite links: a link joins whoever signs up through it to the team, as the role it carries. Only the token's hash
-- is stored; a manager can revoke a link and make a new one.
create table invite_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  store_id uuid not null references stores(id),
  token_hash text not null unique,
  role text not null default 'rep' check (role in ('rep', 'manager')),
  created_by uuid references users(id),
  uses int not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invite_links_store on invite_links (store_id) where revoked_at is null;
alter table invite_links enable row level security;
create policy tenant_isolation on invite_links using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id());
-- Managers see and make their team's links; only admins make manager links.
create policy invite_read on invite_links as restrictive for select to app_user using (app.has_role('manager') or app.has_role('general_manager'));
create policy invite_write on invite_links as restrictive for insert to app_user
  with check ((app.has_role('manager') or app.has_role('general_manager')) and (role = 'rep' or app.has_role('general_manager')));
create policy invite_revoke on invite_links as restrictive for update to app_user using (app.has_role('manager') or app.has_role('general_manager'));
create policy invite_no_delete on invite_links as restrictive for delete to app_user using (false);
create trigger invite_links_touch before update on invite_links for each row execute function app.touch();
grant select, insert, update on invite_links to app_user;
revoke all on invite_links from public;

-- A pending sign-up is now one of three kinds. A join names its invite link and needs no store name.
alter table signups add column kind text not null default 'team' check (kind in ('team', 'individual', 'join'));
alter table signups add column industry text not null default 'cars' check (industry in ('cars', 'homes', 'solar', 'furniture', 'other'));
alter table signups add column invite_id uuid references invite_links(id);
alter table signups alter column store_name drop not null;
alter table signups drop constraint signups_store_name_check;
alter table signups add constraint signups_store_name_check check (store_name is null or length(store_name) between 2 and 120);
alter table signups add constraint signups_kind_shape check (
  (kind = 'team' and store_name is not null) or (kind = 'individual') or (kind = 'join' and invite_id is not null)
);

-- What a join page may show before anyone signs in: the team's name and the role, for a live link only.
create or replace function app.invite_lookup(p_token_hash text) returns table (team text, role text)
language sql stable security definer set search_path = public as $$
  select t.name, l.role from invite_links l join tenants t on t.id = l.tenant_id
  where l.token_hash = p_token_hash and l.revoked_at is null and t.status = 'active'
$$;
revoke all on function app.invite_lookup(text) from public;
grant execute on function app.invite_lookup(text) to app_user;

-- Replaces 0020's version: the kind of sign-up, the industry, and the invite link for a join.
drop function app.signup_request(text, text, text, text, text, int, int, int);
create or replace function app.signup_request(p_kind text, p_email text, p_store_name text, p_first_name text, p_language text, p_industry text, p_invite_hash text, p_code_hash text, p_ttl_seconds int, p_max_per_window int, p_window_seconds int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  recent int;
  invite uuid;
begin
  if exists (select 1 from users u where u.status = 'active' and lower(u.email) = lower(trim(p_email))) then
    return 'exists';
  end if;
  if p_kind = 'join' then
    select l.id into invite from invite_links l join tenants t on t.id = l.tenant_id
    where l.token_hash = p_invite_hash and l.revoked_at is null and t.status = 'active';
    if invite is null then
      return 'invalid_link';
    end if;
  end if;
  select count(*) into recent from signups s where lower(s.email) = lower(trim(p_email)) and s.created_at > now() - make_interval(secs => p_window_seconds);
  if recent >= p_max_per_window then
    return 'rate_limited';
  end if;
  insert into signups (kind, email, store_name, first_name, language, industry, invite_id, code_hash, expires_at)
  values (p_kind, lower(trim(p_email)), nullif(trim(coalesce(p_store_name, '')), ''), nullif(trim(coalesce(p_first_name, '')), ''), p_language, p_industry, invite, p_code_hash, now() + make_interval(secs => p_ttl_seconds));
  return 'sent';
end $$;

-- Replaces 0020's version. A team sign-up makes the owner manager with admin access; an individual gets their own
-- account and practice space; a join adds the person to the invite's team, as the invite's role.
create or replace function app.signup_verify(p_email text, p_code_hash text, p_max_attempts int)
returns table (status text, user_id uuid, tenant_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  s record;
  inv record;
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
  if exists (select 1 from users u where u.status = 'active' and lower(u.email) = lower(s.email)) then
    update signups set consumed_at = now() where id = s.id;
    return query select 'none'::text, null::uuid, null::uuid;
    return;
  end if;

  if s.kind = 'join' then
    -- The link must still be live when the code is entered, not only when it was asked for.
    select l.* into inv from invite_links l join tenants t on t.id = l.tenant_id where l.id = s.invite_id and l.revoked_at is null and t.status = 'active' for update of l;
    if inv.id is null then
      update signups set consumed_at = now() where id = s.id;
      return query select 'invalid_link'::text, null::uuid, null::uuid;
      return;
    end if;
    t_id := inv.tenant_id;
    st_id := inv.store_id;
    insert into users (tenant_id, first_name, email, preferred_language) values (t_id, s.first_name, s.email, s.language) returning id into u_id;
    insert into memberships (tenant_id, user_id, store_id, role) values (t_id, u_id, st_id, inv.role);
    update invite_links set uses = uses + 1 where id = inv.id;
    insert into audit_log (tenant_id, actor_id, action, target_type, target_id, detail)
    values (t_id, u_id, 'person.joined', 'user', u_id, jsonb_build_object('role', inv.role, 'invite', inv.id));
  else
    insert into tenants (name, default_language, kind, industry)
    values (coalesce(s.store_name, coalesce(s.first_name, split_part(s.email, '@', 1)) || '''s practice'), s.language, s.kind, s.industry)
    returning id into t_id;
    insert into stores (tenant_id, name) values (t_id, coalesce(s.store_name, coalesce(s.first_name, split_part(s.email, '@', 1)) || '''s practice')) returning id into st_id;
    insert into store_policies (tenant_id, store_id) values (t_id, st_id);
    insert into users (tenant_id, first_name, email, preferred_language) values (t_id, s.first_name, s.email, s.language) returning id into u_id;
    if s.kind = 'team' then
      insert into memberships (tenant_id, user_id, store_id, role) values (t_id, u_id, st_id, 'manager'), (t_id, u_id, st_id, 'general_manager');
    else
      insert into memberships (tenant_id, user_id, store_id, role) values (t_id, u_id, st_id, 'rep');
    end if;
    insert into audit_log (tenant_id, actor_id, action, target_type, target_id, detail)
    values (t_id, u_id, 'tenant.signup', 'store', st_id, jsonb_build_object('kind', s.kind, 'industry', s.industry));
  end if;
  update signups set consumed_at = now(), created_tenant = t_id where id = s.id;
  return query select 'ok'::text, u_id, t_id;
end $$;

revoke all on function app.signup_request(text, text, text, text, text, text, text, text, int, int, int), app.signup_verify(text, text, int) from public;
grant execute on function app.signup_request(text, text, text, text, text, text, text, text, int, int, int), app.signup_verify(text, text, int) to app_user;
