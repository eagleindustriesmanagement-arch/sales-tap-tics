# Deploying Sales Taptics to salestaptics.com

About 10 minutes in the Vercel dashboard, once. After that, every push to `main` deploys by itself.

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
