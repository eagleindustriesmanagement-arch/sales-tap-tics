# 0014: Hosting on Vercel with Neon Postgres; a trial site with demo sign-in

- **Context.**
  - The owner bought salestaptics.com on Vercel and asked to try the app there. BookFlows ships on Vercel the same
    way.
  - Four things that worked on a single local server would break on a serverless host:
    1. The content library and AI prompts were found through absolute paths baked in at build time.
    2. A hosted database owner is not a superuser, so the role switch and the FORCE row-level security behaved
       differently from every test.
    3. Live practice sessions lived in one server's memory.
    4. Sign-in needs an email sender.
- **Decision.**
  - **Deploys come from GitHub.** Vercel's GitHub integration deploys `main`, with the project's root directory set
    to `apps/web`. `apps/web/vercel.json` runs `pnpm db:deploy` (migrations, the demo seed when asked, the content
    release; every step is safe to repeat) before `next build`, so a failing migration stops the deploy. Functions
    run in `iad1` (US East, near Miami and the database).
  - **Database: Neon, through the Vercel Marketplace**, in US East. The deploy step uses the direct connection
    (`DATABASE_URL_UNPOOLED`); the app uses the pooled one. Serverless instances keep 5 connections each and warm 2.
  - **Roles.** Migration 0012 grants `app_user` and `app_worker` to a non-superuser owner, so `set local role` works
    on a hosted database.
  - **Row-level security without FORCE (migration 0013).**
    - Every table keeps row-level security, and every request still runs as `app_user` or `app_worker`, where the
      policies apply.
    - FORCE also applied the policies to the owner. The owner runs the security-definer sign-in and visibility
      functions, the migrations, the seed and the content release.
    - Tests connect as a superuser, which ignores FORCE, so FORCE made production the only place it took effect:
      sign-in and the seed failed there. A test now checks that every tenant table has row-level security and
      none uses FORCE.
    - The full browser suite passes against a database owned by a non-superuser.
  - **Content paths are resolved at run time.** The first existing directory wins: the configured one, then
    relative to the working directory, then relative to the code.
  - **Live sessions survive a change of instance.** Each turn is stored with the customer's raw line. An instance
    that does not hold a session rebuilds it from its stored turns (`replayPracticeSession`):
    - exactly in offline mode;
    - in live-AI mode with the recorded replies, while the unlock detector re-reads the turns.
  - **Trial sign-in.** With `TAPTICS_DEMO_LOGIN=1`:
    - The demo store's accounts (`@demo.test`, which have no inbox) show their code on screen and fill it in.
    - The sign-in screen offers one-tap roles: rep, manager, general manager.
    - Every other address needs email (`RESEND_API_KEY` and `TAPTICS_EMAIL_FROM`).
- **Consequence.**
  - Anyone with the link can sign in to the demo store while `TAPTICS_DEMO_LOGIN=1` is set. The demo store holds
    no real data. Unset it, and set up email, before a real store's people are invited.
  - `TAPTICS_SECRET` must be set (sign-in refuses to run in production without it).
  - Without `ANTHROPIC_API_KEY`, the site runs the offline customer and partial scores, as the UI says.
