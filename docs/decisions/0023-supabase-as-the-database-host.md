# 0023: Supabase as the database host is supported

- **Context.**
  - On 2026-10-03 Ernesto asked for a Supabase project for the app's `DATABASE_URL`. Decision 0014 had planned Neon
    through Vercel's marketplace.
  - This environment cannot reach Supabase's API and holds no Supabase token, so the project is created outside
    the build sessions.
  - Three things differ on Supabase:
    1. Its direct database address is IPv6-only on the free plan, and Vercel's functions have no IPv6.
    2. Its Data API publishes every table in `public` and grants new tables to its `anon` and `authenticated`
       roles.
    3. Vercel's Supabase integration names the variables `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING`.
- **Decision.**
  - **Connections.** The deploy step uses the session pooler (port 5432) and the app the transaction pooler (port
    6543). Each request's role and tenant are set per transaction (`set local`, `set_config(..., true)`), which
    transaction pooling keeps.
  - **Variable names.** The app reads `DATABASE_URL`, then `POSTGRES_URL`. The deploy step reads
    `DATABASE_URL_UNPOOLED`, then `POSTGRES_URL_NON_POOLING`, `DATABASE_URL` and `POSTGRES_URL`.
  - **Migration 0018.** It revokes every privilege `anon` and `authenticated` hold on the app's tables, sequences
    and functions and on the `app` schema, along with the default privileges that would grant them future tables.
    It does nothing where those roles do not exist (Neon, CI, local).
    - Row-level security already returned nothing to those roles; this closes the door as well.
    - A test builds Supabase's grants on a fresh database, migrates, and finds no access. It fails without
      migration 0018.
  - **Credentials stay out of chat.** A connection string carries the database password. It goes from Supabase
    straight into Vercel's environment variables and is never written in a chat, a ticket or the repository.
- **Consequence.**
  - Neon and Supabase both work. `docs/DEPLOY.md` has a Supabase section.
  - Supabase's pooler certificate has not been tried from this environment. If the first deploy reports a
    certificate error, the fix is Supabase's CA certificate, not turning verification off.
