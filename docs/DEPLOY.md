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
| `RESEND_API_KEY`, `TAPTICS_EMAIL_FROM` | A Resend key; `Sales Taptics <login@salestaptics.com>` | **Required for real accounts** (decision 0029): sign-up codes, sign-in codes and invitations. salestaptics.com must be verified in Resend first. Without it, only the demo works. |
| `TAPTICS_APP_URL` | `https://salestaptics.com` (the default) | The sign-in address in invitation emails. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | From `npx web-push generate-vapid-keys`; subject `mailto:login@salestaptics.com` | Daily practice reminders on reps' phones (decision 0022). |
| `CRON_SECRET` | A random string (`openssl rand -hex 32`) | Lets the hourly reminder job run. Then schedule an hourly call to `/api/cron/reminders`: on a Vercel Pro plan add `"crons": [{"path": "/api/cron/reminders", "schedule": "0 * * * *"}]` to `apps/web/vercel.json`; on Hobby (daily crons only) use any hourly scheduler that sends `Authorization: Bearer <CRON_SECRET>`. |

### Using Supabase instead of Neon (decision 0023)

The app runs on any Postgres 16. With Supabase:

1. Create the project (East US, North Virginia, free plan is fine). Create no tables: the deploy step runs the
   migrations.
2. Use the **pooler** connection strings (host `aws-0-us-east-1.pooler.supabase.com`, under **Connect**). Do not
   use the direct `db.<ref>.supabase.co` address: on the free plan it is reachable only over IPv6, which Vercel's
   functions cannot reach.

   | Vercel variable | Supabase connection string | Used by |
   | --- | --- | --- |
   | `DATABASE_URL_UNPOOLED` | Session pooler, port 5432 | The deploy step (migrations, seed, content release) |
   | `DATABASE_URL` | Transaction pooler, port 6543 | The app (every request's settings are per transaction, so transaction mode is safe) |

   Vercel's Supabase integration names them `POSTGRES_URL_NON_POOLING` and `POSTGRES_URL`; both names work.
   If only `DATABASE_URL` is set (the transaction pooler), the deploy step runs through it too: every migration, the
   seed and the content release run in their own transaction under one lock (decision 0025). Production and Preview
   may share the database; two builds deploying at once apply each migration once.
3. Copy the strings from Supabase straight into Vercel's environment variables. They hold the database password:
   never paste them into a chat, a ticket or the repository.
4. Migration 0018 takes away the access Supabase's Data API roles (`anon`, `authenticated`) get to every table.
   The app never uses that API. You can also turn the Data API off in Supabase's API settings.
5. **Certificate (decision 0026).** Supabase signs its certificates with its own CA. If the deploy fails with
   "unable to verify the first certificate" or "self-signed certificate in certificate chain", download the CA
   certificate (Database settings, SSL configuration) and add its contents to Vercel as `DATABASE_CA_CERT` for
   Production and Preview. Every connection then verifies against it. Do not turn verification off.

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
