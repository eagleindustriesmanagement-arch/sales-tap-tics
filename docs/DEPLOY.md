# Deploying Sales Taptics to salestaptics.com

Two ways: Claude does it (section A, needs one token), or the owner clicks through the dashboard (section B, about
10 minutes). Either way, after the first deploy every push to `main` deploys by itself.

## A. Claude deploys (automated)

What the owner provides, once, in the cloud environment's settings. Claude never asks for a token in chat.

- **Network access:** add `api.vercel.com`, `vercel.com`, `*.vercel.app`, `salestaptics.com` and
  `www.salestaptics.com` to Allowed domains (keep the default package-manager list).
- **Environment variable `VERCEL_TOKEN`:** a Vercel access token (vercel.com → Account Settings → Tokens, scope:
  the account or team that owns salestaptics.com). If the domain is under a team, also set `VERCEL_SCOPE` to the
  team's slug.
- Then start a **new** session on this repository (environment changes apply to new sessions) and say "deploy to
  Vercel per docs/DEPLOY.md".

What Claude runs (from the repository root; `V="npx vercel@latest --token $VERCEL_TOKEN ${VERCEL_SCOPE:+--scope $VERCEL_SCOPE}"`):

1. `$V whoami`: the token works.
2. `$V link --yes --project sales-taptics`: creates or links the project. Then set the root directory and
   framework: `PATCH https://api.vercel.com/v9/projects/sales-taptics` with
   `{"rootDirectory":"apps/web","framework":"nextjs"}` (add `?teamId=` for a team).
3. `$V integration add neon`: Neon Postgres from the Vercel Marketplace, region US East, connected to
   Production, Preview and Development. If Vercel asks for the marketplace terms to be accepted in a browser,
   that one click is the owner's.
4. Environment variables, Production and Preview:
   - `TAPTICS_SECRET`: `openssl rand -hex 32` piped straight into `$V env add`, never printed.
   - `TAPTICS_DEMO_LOGIN=1` and `TAPTICS_DEMO_SEED=1`.
5. `$V git connect https://github.com/eagleindustriesmanagement-arch/sales-tap-tics`: deploys on every push to
   `main`. Needs the Vercel GitHub app to have access to the repository; if it does not, deploy with step 6 and
   tell the owner.
6. `$V deploy --prod`. The build log must show the migrations applied, `demo store seeded` and the content release.
7. `$V domains add salestaptics.com sales-taptics` and `www.salestaptics.com` (redirect to the apex).
8. Verify on the live site, in a phone-sized browser:
   - the sign-in screen with the logo;
   - each demo role signs in;
   - a typed practice session runs to the debrief;
   - Progress, Team and Dashboard load.
   Report the results with screenshots.

## B. The owner deploys (dashboard)

## 1. Import the repository

1. Vercel dashboard → **Add New… → Project** → import `eagleindustriesmanagement-arch/sales-tap-tics`.
2. **Root Directory:** `apps/web`. Leave "Include files outside the root directory" on.
3. Framework, install and build commands come from `apps/web/vercel.json`; leave them alone.
4. Don't deploy yet. Open **Environment Variables** first (step 3), or let the first deploy fail and redeploy after.

## 2. Add the database

1. In the new project: **Storage → Create Database → Neon (Postgres)**.
2. Region: **US East (Washington, D.C. / N. Virginia)**. Connect it to the Production, Preview and Development
   environments.
3. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to the project. Nothing to copy.

## 3. Environment variables

Project → Settings → Environment Variables. For Production (and Preview if you like):

| Name | Value | Why |
| --- | --- | --- |
| `TAPTICS_SECRET` | A random string of 48+ characters. On a Mac: `openssl rand -hex 32` in Terminal. | Protects sign-in codes. Required. |
| `TAPTICS_DEMO_LOGIN` | `1` | The trial: one-tap demo roles with the code on screen. |
| `TAPTICS_DEMO_SEED` | `1` | Creates the demo store on deploy. |

Optional, any time later:

| Name | Value | Turns on |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | The live AI customer and full scoring (otherwise offline, partial scores). |
| `RESEND_API_KEY`, `TAPTICS_EMAIL_FROM` | A Resend key; `Sales Taptics <login@salestaptics.com>` | Sign-in by email for real people. salestaptics.com must be verified in Resend first. |

## 4. Deploy and add the domain

1. **Deployments → Redeploy** (or push to `main`). The build log shows `applied: 0001_init.sql …` and
   `demo store seeded`.
2. **Settings → Domains → Add** `salestaptics.com` (and `www.salestaptics.com`, redirecting to it). Since the
   domain was bought on Vercel, DNS is set automatically.

## 5. Try it

Open https://salestaptics.com and tap one of the demo roles on the sign-in screen: a sales rep, a sales manager,
or the general manager. On a phone, Share → Add to Home Screen installs it with the logo.

## Before a real store signs in

- Remove `TAPTICS_DEMO_LOGIN` and `TAPTICS_DEMO_SEED`.
- Set up email (`RESEND_API_KEY`, `TAPTICS_EMAIL_FROM`).
- See decision 0014.
