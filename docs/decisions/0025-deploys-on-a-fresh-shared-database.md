# 0025: Deploys are safe on a fresh database, through a pooler, and two at a time

- **Context.**
  - On 2026-10-03 the Vercel project was linked to the repository. `DATABASE_URL` points to a fresh Supabase
    project and is set for both Production and Preview.
  - Every build runs the deploy step: migrations, the demo seed and the content release. Three things could go
    wrong:
    1. Two builds share one database and can deploy at the same moment. The migration runner checked what was
       applied without any lock, so both could apply the same migration, and one fails.
    2. The content release inserted its items one at a time, outside a transaction. A build killed half way left a
       release that is never completed, because the next build sees its version and skips it. Two builds could
       also publish two releases of one version.
    3. The demo seed checked for each row, then inserted it, with no unique key behind some of the checks. Two
       builds could duplicate memberships.
  - Only `DATABASE_URL` is set, which on Supabase is usually the transaction pooler (port 6543). There, a
    session-level lock is unsafe.
- **Decision.**
  - **One deploy lock.** Migrations, the seed and the release each take `pg_advisory_xact_lock` inside their own
    transaction, then re-check whether their work is already done. A transaction-scoped lock holds through a
    transaction pooler.
  - **Migrations.** Each migration runs in one transaction with the lock, after re-reading `schema_migrations`.
  - **The content release.** One transaction, and one statement for all its items.
  - **The demo seed.** One transaction.
  - **Tests.**
    - A database test races three deploys on an empty database: every migration runs once, the seed makes one of
      each row, there is one complete release, and a release that fails half way leaves nothing. All four fail
      without the lock.
    - CI's first step rehearses Supabase on a fresh server: a non-superuser owner that creates the app roles,
      `anon` and `authenticated` with default grants, pgcrypto already in an `extensions` schema, and PgBouncer in
      transaction mode on port 6543. Two deploys run at once, then a third, and the database is checked for
      duplicates and for the Data API roles' access.
    - Locally the full browser suite (24 tests) passed with the app reaching that database only through the
      transaction pooler, as the non-superuser owner.
- **Consequence.**
  - Production and Preview can share a database and deploy together.
  - A deploy waits for another one already in progress. Each step is short, so the wait is seconds.
  - The app keeps no session state on a connection (each request's settings are per transaction), which is what
    makes transaction pooling safe for it.
