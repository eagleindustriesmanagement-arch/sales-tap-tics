-- Every row's people and store belong to the row's own company (October 5: a cross-tenant browser test found that a
-- general manager could add a membership, and then an assignment, for a user of another company: row-level
-- security kept every read isolated, but a write could still point at someone else's user).
--
-- A composite foreign key (user, tenant) -> users(id, tenant_id) makes the database refuse such a row, whatever the
-- application does. NOT VALID: enforced for every new or changed row from now on, without failing the deploy over a
-- historical row; the cross-tenant test checks that none exists in the test database.

alter table users add constraint users_id_tenant_unique unique (id, tenant_id);
alter table stores add constraint stores_id_tenant_unique unique (id, tenant_id);

do $$
declare
  pair text[];
begin
  foreach pair slice 1 in array array[
    ['memberships', 'user_id'], ['consents', 'user_id'], ['assignments', 'user_id'], ['assignments', 'assigned_by'],
    ['sessions', 'user_id'], ['score_overrides', 'manager_id'], ['behavior_card_issues', 'user_id'],
    ['floor_checks', 'manager_id'], ['certifications', 'user_id'], ['crm_outcomes', 'user_id'],
    ['coach_practice', 'manager_id'], ['store_metrics', 'rep_user_id'], ['store_metrics', 'imported_by'],
    ['push_subscriptions', 'user_id'], ['reminders_sent', 'user_id'], ['invite_links', 'created_by'],
    ['store_policies', 'approved_by'], ['store_fees', 'approved_by'], ['violations', 'reviewed_by'],
    ['store_calibrations', 'computed_by']
  ] loop
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = pair[1] and column_name = 'tenant_id') then
      execute format('alter table %I add constraint %I foreign key (%I, tenant_id) references users (id, tenant_id) not valid',
        pair[1], pair[1] || '_' || pair[2] || '_same_tenant', pair[2]);
    end if;
  end loop;
  foreach pair slice 1 in array array[
    ['memberships', 'store_id'], ['sessions', 'store_id'], ['invite_links', 'store_id'], ['crm_outcomes', 'store_id'],
    ['store_calibrations', 'store_id'], ['store_fees', 'store_id'], ['store_lenders', 'store_id'],
    ['store_metrics', 'store_id'], ['store_policies', 'store_id'], ['teams', 'store_id']
  ] loop
    execute format('alter table %I add constraint %I foreign key (%I, tenant_id) references stores (id, tenant_id) not valid',
      pair[1], pair[1] || '_' || pair[2] || '_same_tenant', pair[2]);
  end loop;
end $$;
