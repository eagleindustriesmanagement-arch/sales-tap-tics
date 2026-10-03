# 0022: Practice reminders by Web Push

- **Context.**
  - Spec 15.3 item 5: one push or text reminder at the rep's chosen time, never more than one a day, and never in
    the store's peak hours (a store setting, default Saturday 11:00 to 17:00).
  - The timing rule was built and tested; sending waited on "a push or SMS provider".
  - SMS needs a paid provider and texting consent. Web Push is free, built into browsers and installed PWAs, and
    needs no outside account, only a key pair the deployment generates.
- **Decision.**
  - **Delivery.**
    - Reminders go by Web Push (the `web-push` library, VAPID keys).
    - A rep turns them on for each phone in Settings. A service worker (`/sw.js`) shows the notification and opens
      the app on Today.
    - On iPhone, Web Push works only for an app added to the Home Screen; Settings says so.
  - **Storage.**
    - `push_subscriptions`: each person reads, adds and removes only their own phones. A phone already saved for
      one person is never moved to another.
    - `reminders_sent`: written only by the job (`app_worker`), one row per person and day. The job claims the row
      before sending, so overlapping runs cannot send twice.
  - **The job, `/api/cron/reminders`.**
    - It runs hourly. A reminder goes out on the first run at or after the chosen time (moved past the store's peak
      hours), and not if the person already practiced that day.
    - It is called with `Authorization: Bearer <CRON_SECRET>` and refuses every call when `CRON_SECRET` is not set.
    - A phone the push service reports gone (404 or 410) is removed.
    - It logs counts only.
  - **Peak hours.** The spec's default (Saturday 11:00 to 17:00) applies until the store setup screen gets a
    peak-hours field.
  - **Off until configured.** Without `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`, Settings shows
    no reminder control and the job does nothing.
- **Consequence.**
  - The deployment needs three VAPID variables (from `npx web-push generate-vapid-keys`), a `CRON_SECRET`, and an
    hourly call to `/api/cron/reminders`.
    - Vercel Cron sends the secret in that header. Hourly crons need a paid Vercel plan (Hobby allows daily only),
      so `vercel.json` does not declare one.
    - The owner either adds `{"path": "/api/cron/reminders", "schedule": "0 * * * *"}` to `crons` on a Pro plan,
      or points any hourly scheduler at the URL with the header.
  - Reminders arrive up to an hour after the chosen time.
  - Text-message reminders remain a later option behind the consent rules (CONSENT-01).
