-- The audit log is for the general manager (spec 18.3 Audit log); everyone's actions are still written to it.
create policy audit_read on audit_log as restrictive for select to app_user using (app.has_role('general_manager'));

-- Spec 3.3 rule 4: an automated score is never edited; a manager adds a flag with a reason, logged and shown next to
-- the original score to anyone who can see the session. Overrides are permanent, like the score.
create policy override_read on score_overrides as restrictive for select to app_user
  using (exists (select 1 from scores sc where sc.id = score_id and app.can_view_session(sc.session_id)));
alter table score_overrides add constraint score_overrides_flag check (flag in ('judge_disagrees', 'audio_problem', 'scenario_problem', 'other'));
create trigger score_overrides_immutable before update or delete on score_overrides for each row execute function app.immutable();
