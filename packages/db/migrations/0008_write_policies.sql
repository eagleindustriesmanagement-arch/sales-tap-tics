-- Spec 3.3 rule 2: row-level security is the second line of defense for writes too, not only reads. Until now most
-- tables limited writes to the tenant and trusted the application for the rest. These restrictive policies apply
-- to the app role only; the background worker (app_worker) and migrations are unaffected.

create or replace function app.owns_session(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sessions where id = sid and user_id = app.user_id() and tenant_id = app.tenant_id())
$$;
grant execute on function app.owns_session(uuid) to app_user, app_worker;

create or replace function app.is_manager() returns boolean language sql stable as $$
  select app.has_role('manager') or app.has_role('general_manager')
$$;
grant execute on function app.is_manager() to app_user, app_worker;

-- People and roles: the general manager administers them; a user may update only their own preferences.
create policy users_insert on users as restrictive for insert to app_user with check (app.has_role('general_manager'));
create policy users_update on users as restrictive for update to app_user using (id = app.user_id() or app.has_role('general_manager'));
create policy users_delete on users as restrictive for delete to app_user using (false);
create or replace function app.users_guard() returns trigger language plpgsql as $$
begin
  if app.user_id() is not null and not app.has_role('general_manager')
     and (new.email, new.phone, new.status, new.tenant_id, new.first_name, new.last_name, new.hire_date)
         is distinct from (old.email, old.phone, old.status, old.tenant_id, old.first_name, old.last_name, old.hire_date) then
    raise exception 'only the general manager changes a person''s identity or status';
  end if;
  return new;
end $$;
create trigger users_guard before update on users for each row execute function app.users_guard();

create policy memberships_insert on memberships as restrictive for insert to app_user with check (app.has_role('general_manager'));
create policy memberships_update on memberships as restrictive for update to app_user using (app.has_role('general_manager'));
create policy memberships_delete on memberships as restrictive for delete to app_user using (app.has_role('general_manager') and user_id <> app.user_id());

-- Store configuration: the general manager edits; the compliance reviewer only signs off (enforced by trigger).
create policy stores_write on stores as restrictive for insert to app_user with check (false);
create policy stores_update on stores as restrictive for update to app_user using (app.has_role('general_manager'));
create policy stores_delete on stores as restrictive for delete to app_user using (false);
create policy teams_insert on teams as restrictive for insert to app_user with check (app.has_role('general_manager'));
create policy teams_update on teams as restrictive for update to app_user using (app.has_role('general_manager'));
create policy teams_delete on teams as restrictive for delete to app_user using (app.has_role('general_manager'));
create policy store_fees_insert on store_fees as restrictive for insert to app_user with check (app.has_role('general_manager'));
create policy store_fees_update on store_fees as restrictive for update to app_user using (app.has_role('general_manager'));
create policy store_fees_delete on store_fees as restrictive for delete to app_user using (app.has_role('general_manager'));
create policy store_lenders_insert on store_lenders as restrictive for insert to app_user with check (app.has_role('general_manager'));
create policy store_lenders_update on store_lenders as restrictive for update to app_user using (app.has_role('general_manager'));
create policy store_lenders_delete on store_lenders as restrictive for delete to app_user using (app.has_role('general_manager'));
create policy store_policies_insert on store_policies as restrictive for insert to app_user with check (app.has_role('general_manager'));
create policy store_policies_update on store_policies as restrictive for update to app_user using (app.has_role('general_manager') or app.has_role('compliance_reviewer'));
create policy store_policies_delete on store_policies as restrictive for delete to app_user using (false);
create or replace function app.store_policies_guard() returns trigger language plpgsql as $$
begin
  if app.user_id() is not null and not app.has_role('general_manager')
     and (to_jsonb(new) - 'approved_by' - 'approved_at' - 'updated_at') is distinct from (to_jsonb(old) - 'approved_by' - 'approved_at' - 'updated_at') then
    raise exception 'the compliance reviewer signs off store settings but does not change them';
  end if;
  return new;
end $$;
create trigger store_policies_guard before update on store_policies for each row execute function app.store_policies_guard();

-- Practice results: written only for the rep's own session; the session itself is ended only by its rep.
create policy sessions_update on sessions as restrictive for update to app_user using (user_id = app.user_id());
create policy sessions_delete on sessions as restrictive for delete to app_user using (false);
create policy turns_insert on turns as restrictive for insert to app_user with check (app.owns_session(session_id));
create policy events_insert on scenario_state_events as restrictive for insert to app_user with check (app.owns_session(session_id));
create policy violations_insert on violations as restrictive for insert to app_user with check (app.owns_session(session_id));
create policy scores_insert on scores as restrictive for insert to app_user with check (app.owns_session(session_id));
create policy debriefs_insert on debriefs as restrictive for insert to app_user with check (app.owns_session(session_id));
create policy usage_insert on model_usage as restrictive for insert to app_user with check (session_id is null or app.owns_session(session_id));
create policy consents_insert on consents as restrictive for insert to app_user with check (user_id = app.user_id());

-- Coaching: managers record checks; a rep's own finished session may issue their card.
create policy cards_insert on behavior_card_issues as restrictive for insert to app_user with check (user_id = app.user_id() or app.is_manager());
create policy cards_update on behavior_card_issues as restrictive for update to app_user using (app.is_manager() and app.can_view_user(user_id));
create policy floor_checks_insert on floor_checks as restrictive for insert to app_user with check (app.is_manager() and manager_id = app.user_id());
create policy check_quality_insert on manager_check_quality as restrictive for insert to app_user with check (app.is_manager());

-- Published content is written by the publishing job, never by a signed-in user.
create policy content_releases_insert on content_releases as restrictive for insert to app_user with check (false);
create policy content_items_insert on content_items as restrictive for insert to app_user with check (false);

-- Login codes and sign-in sessions are reached only through the security-definer functions in 0002.
create policy login_codes_none on login_codes as restrictive to app_user using (false) with check (false);
create policy auth_sessions_none on auth_sessions as restrictive to app_user using (false) with check (false);
