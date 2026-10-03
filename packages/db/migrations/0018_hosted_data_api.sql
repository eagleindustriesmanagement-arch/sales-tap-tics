-- Decision 0023: on a host that publishes the public schema through an automatic web API (Supabase's Data API
-- grants its `anon` and `authenticated` roles access to every new table), take that access away. The app reaches
-- the database only through its own server, as app_user and app_worker; row-level security already returns nothing
-- to those roles, and this removes the door as well. A no-op where the roles do not exist.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('revoke usage on schema app from %I', r);
      -- Tables later migrations create (as the role that runs them) start without that access too.
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
    end if;
  end loop;
end $$;
