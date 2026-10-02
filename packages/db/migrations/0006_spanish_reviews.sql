-- Spec 16.3 and decision 0010: one review decision per Spanish line, with the texts it was made against.
create table spanish_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  content_kind text not null check (content_kind in ('scenario', 'persona')),
  content_code text not null,
  line_key text not null,
  en_text text not null,
  es_original text not null,
  es_final text not null,
  needs_compliance boolean not null,
  reviewed_by uuid not null references users(id),
  reviewed_at timestamptz not null default now(),
  compliance_by uuid references users(id),
  compliance_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, content_code, line_key)
);
create trigger spanish_reviews_touch before update on spanish_reviews for each row execute function app.touch();

alter table spanish_reviews enable row level security;
alter table spanish_reviews force row level security;
create policy tenant_isolation on spanish_reviews using (tenant_id = app.tenant_id()) with check (tenant_id = app.tenant_id());

create or replace function app.has_role(wanted text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = app.user_id() and tenant_id = app.tenant_id() and role = wanted)
$$;
grant execute on function app.has_role(text) to app_user, app_worker;

create policy spanish_review_read on spanish_reviews as restrictive for select to app_user
  using (app.has_role('content_editor') or app.has_role('compliance_reviewer') or app.has_role('general_manager'));
-- The Spanish reviewer writes the line; the compliance reviewer only signs off lines with numbers.
create policy spanish_review_write on spanish_reviews as restrictive for insert to app_user
  with check (app.has_role('content_editor') and reviewed_by = app.user_id());
create policy spanish_review_update on spanish_reviews as restrictive for update to app_user
  using (app.has_role('content_editor') or (app.has_role('compliance_reviewer') and needs_compliance));
grant select, insert, update on spanish_reviews to app_user, app_worker;

-- A compliance sign-off cannot rewrite the Spanish, and a Spanish edit clears an earlier sign-off.
create or replace function app.spanish_review_guard() returns trigger language plpgsql as $$
begin
  if not app.has_role('content_editor') and (new.es_final, new.en_text, new.es_original, new.reviewed_by) is distinct from (old.es_final, old.en_text, old.es_original, old.reviewed_by) then
    raise exception 'only the Spanish reviewer changes the line';
  end if;
  if new.es_final is distinct from old.es_final then
    new.compliance_by := null;
    new.compliance_at := null;
  end if;
  return new;
end $$;
create trigger spanish_reviews_guard before update on spanish_reviews for each row execute function app.spanish_review_guard();
