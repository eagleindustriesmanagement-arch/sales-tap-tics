-- Spec 14.5 item 4: a manager assigns a scenario to one or many reps, with a due date and a reason the rep sees.
-- Visibility: a rep sees their own; a manager sees and assigns only to reps they can view (app.can_view_user).
create policy assignment_visibility on assignments as restrictive for select to app_user
  using (user_id = app.user_id() or app.can_view_user(user_id));
create policy assignment_insert on assignments as restrictive for insert to app_user
  with check (assigned_by = app.user_id() and user_id <> app.user_id() and app.can_view_user(user_id));
create policy assignment_update on assignments as restrictive for update to app_user
  using (user_id = app.user_id() or assigned_by = app.user_id());
create policy assignment_delete on assignments as restrictive for delete to app_user
  using (assigned_by = app.user_id());

-- The assigned rep may only mark the assignment done; what was assigned, when and why stay the manager's.
create or replace function app.assignment_guard() returns trigger language plpgsql as $$
begin
  if app.user_id() is distinct from old.assigned_by
     and (new.user_id, new.scenario_code, new.module_code, new.assigned_by, new.due_at, new.reason)
         is distinct from (old.user_id, old.scenario_code, old.module_code, old.assigned_by, old.due_at, old.reason) then
    raise exception 'only the assigning manager can change an assignment';
  end if;
  return new;
end $$;
create trigger assignments_guard before update on assignments for each row execute function app.assignment_guard();

create index assignments_open on assignments (user_id, due_at) where completed_at is null;

-- A rep cannot read their manager's user row, but may see who assigned the work: the first name only, same tenant.
create or replace function app.colleague_first_name(target uuid) returns text
language sql stable security definer set search_path = public as $$
  select first_name from users where id = target and tenant_id = app.tenant_id()
$$;
grant execute on function app.colleague_first_name(uuid) to app_user, app_worker;
