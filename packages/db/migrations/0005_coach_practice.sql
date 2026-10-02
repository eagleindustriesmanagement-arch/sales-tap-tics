-- Spec 14.3: a monthly "coach the coach" roleplay. The manager delivers a floor check to a simulated rep and is
-- scored on the four-part shape. Private to the manager; the general manager of the store sees every manager's.
create table coach_practice (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  manager_id uuid not null references users(id),
  card_code text not null,
  language text not null check (language in ('en', 'es')),
  text text not null,
  parts jsonb not null,
  one_behavior boolean not null,
  score int not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger coach_practice_immutable before update or delete on coach_practice for each row execute function app.immutable();

alter table coach_practice enable row level security;
alter table coach_practice force row level security;
create policy tenant_isolation on coach_practice using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id());
create policy coach_practice_visibility on coach_practice as restrictive for select to app_user
  using (manager_id = app.user_id() or exists (
    select 1 from memberships gm join memberships m on m.store_id = gm.store_id and m.user_id = coach_practice.manager_id
    where gm.user_id = app.user_id() and gm.role = 'general_manager'));
create policy coach_practice_insert on coach_practice as restrictive for insert to app_user
  with check (manager_id = app.user_id());
grant select, insert on coach_practice to app_user, app_worker;
create index coach_practice_manager on coach_practice (manager_id, created_at desc);
