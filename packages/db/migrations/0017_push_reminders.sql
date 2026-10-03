-- Spec 15.3 item 5, decision 0022: one practice reminder a day by Web Push, at the rep's chosen time, never in the
-- store's peak hours. A person's phones are their own: each person reads, adds and removes only their own
-- subscriptions. The reminder job (app_worker) reads them and records what it sent, once per person and day.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscriptions_user on push_subscriptions (user_id);
create trigger push_subscriptions_touch before update on push_subscriptions for each row execute function app.touch();
alter table push_subscriptions enable row level security;
create policy tenant_isolation on push_subscriptions using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id());
create policy push_subscriptions_own on push_subscriptions as restrictive to app_user
  using (user_id = app.user_id()) with check (user_id = app.user_id());
grant select, insert, update, delete on push_subscriptions to app_user;
grant select, delete on push_subscriptions to app_worker;

create table reminders_sent (
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  day date not null,
  sent_at timestamptz not null default now(),
  devices int not null default 0,
  primary key (user_id, day)
);
alter table reminders_sent enable row level security;
create policy tenant_isolation on reminders_sent using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id());
create policy reminders_sent_worker_only on reminders_sent as restrictive to app_user using (false) with check (false);
grant select on reminders_sent to app_user;
grant select, insert, update on reminders_sent to app_worker;
