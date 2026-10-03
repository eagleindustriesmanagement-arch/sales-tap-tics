-- Decision 0014. Row-level security stays on for every table, and every request still runs as app_user or
-- app_worker (`set local role`), where the policies apply. FORCE is dropped: it applies the policies to the tables'
-- owner too, and the owner is who runs the security-definer sign-in and visibility functions, the migrations, the
-- content release and the demo seed. Tests and local development connect as a superuser, which ignores FORCE, so
-- with FORCE a hosted database (where the owner is not a superuser) would behave unlike anything tested: sign-in
-- and the seed fail there. Without it, production behaves exactly as the tests do.
do $$
declare r record;
begin
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relforcerowsecurity
  loop
    execute format('alter table %I no force row level security', r.relname);
  end loop;
end $$;
