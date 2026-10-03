# 0029: Dealerships sign themselves up; the demo store is the second path

- **Context.** Ernesto (October 3): real accounts become the primary way in. A dealership signs up with its store
  name and a work email, verifies an emailed code (the existing mechanism), and the owner invites reps and
  managers. Sessions, scores and team data stay scoped to the account. "Try the demo" stays, as a second path.
- **Decision.**
  - **Sign-up** (`/signup`, `POST /api/auth/signup` and `/api/auth/signup/verify`, migration 0020): store name,
    first name, work email, then a six-digit code with the same lifetime, attempt limit and rate limit as sign-in
    codes.
    - The verified code creates, in one transaction inside a security-definer function, the tenant, its first
      store with default (strictest) policies, and the owner as that store's general manager. It is audited
      (`tenant.signup`).
    - Pending sign-ups are readable by no application role.
  - **No account enumeration.** If the email already has an account, an ordinary sign-in code is sent instead and
    the answer is the same. Entering it on the sign-up screen simply signs in; no second store is created.
  - **First run.** After the notice, a new store's owner (alone in the store) lands on People with a welcome card.
    People they add get an invitation email (best effort; it carries no code) and sign in with their own code.
  - **Isolation.** Unchanged and now exercised: every row carries the tenant, row-level security scopes it.
    - Tests prove a new store sees only itself and the demo store cannot see it.
    - The browser test proves an invited rep practices inside the new store.
  - **A new store needs no setup to practice.** Without fees configured, scenarios use their own facts. The
    general manager sets the real fees and lenders in Store setup, which then drive the compliance checker.
  - **The demo** stays behind `TAPTICS_DEMO_LOGIN=1`. `/login?demo=1` ("Try the demo" on the home page) shows the
    three demo seats first; plain `/login` puts email sign-in first.
- **Needs the owner.** Codes and invitations go by email through Resend. Production needs `RESEND_API_KEY` (and a
  verified sending domain for `TAPTICS_EMAIL_FROM`, default `login@salestaptics.com`). Without it:
  - sign-up answers "cannot send email codes right now";
  - invited people can still sign in, but nobody can receive a code, so only the demo works.
- **Not yet.** Per-address limits only, no per-network limit on sign-up requests. No self-serve billing (pilots
  are free), no second store per tenant, no SMS codes.
