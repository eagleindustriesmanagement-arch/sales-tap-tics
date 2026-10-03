-- Hosted Postgres (decision 0014). The app switches to app_user or app_worker inside each transaction
-- (`set local role`). A superuser may do that without membership; the owner role on a hosted service such as Neon
-- is not a superuser, and Postgres 16 does not give a role's creator the right to SET it, so the owner is granted
-- both roles explicitly. Nothing changes for a superuser.
do $$
begin
  if not (select rolsuper from pg_roles where rolname = current_user) then
    execute format('grant app_user, app_worker to %I', current_user);
  end if;
end $$;

-- The customer's line with its bracket cues, so a live session can be rebuilt on any server instance.
alter table turns add column raw_text text;
