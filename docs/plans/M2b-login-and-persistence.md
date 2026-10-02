# Plan: login and persistence (finishing M1 auth, making M2 and M5 durable)

Date: 2026-10-02. Spec sections: 3.3, 6, 12, 14, 18.1, 20.

## Build

1. Migration `0002_auth.sql`: one-time login codes and login sessions, both hashed, tenant-scoped, under RLS.
   Security-definer functions do the only lookups that must cross tenants (find a user by email or phone).
   Rate limits: codes per identifier per 15 minutes, attempts per code.
2. `packages/db` repository: users and memberships, consent, practice sessions (private window from store
   policy), turns, engine events, violations, scores, debriefs, model usage, weekly behavior cards, floor checks
   with coaching-quality rows, audit log, platform content releases.
3. Seed script for a demo tenant (one store, rep, second rep, manager, general manager, fees, policy).
4. Web: `/login` (email or phone, six-digit code), `/consent` (spec 20.1), server-side auth and role checks on
   every page and API route, sessions written turn by turn and scored into the database, manager floor mode and
   team view read from the database. Code delivery through an interface: email via Resend when `RESEND_API_KEY` is
   set, the server log otherwise (and on screen only when `TAPTICS_DEV_LOGIN=1`).

## Tests

- Auth functions against Postgres: unknown identifier, expiry, wrong code, lockout after five attempts, rate limit,
  session resolve and revoke, no cross-tenant leakage.
- Repository: a full session saved and read back by the rep; invisible to a second rep; visible to the manager only
  after the private window; card issued and checked; audit entry on another user's recording read.
- Browser: login → consent → practice → debrief → data in the database → manager records the floor check.

## Decisions taken here

- An active email or phone belongs to one user across the platform (simplest unambiguous login).
- Live practice state stays in process memory during a session (as the gateway's Redis state will); every turn is
  written as it happens, and the result at the end.
