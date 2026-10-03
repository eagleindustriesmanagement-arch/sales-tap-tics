import "server-only";
import webpush from "web-push";
import { dropPushSubscription, markReminderSent, reminderCandidates, withTenant } from "@taptics/db";
import { t } from "@taptics/i18n";
import { reminderDue, storeClock } from "@taptics/session";
import { pool, withClient } from "./db";
import { errorField, log } from "./log";

const TZ = "America/New_York";

/** Reminders by Web Push are on only when the deployment has VAPID keys (decision 0022). */
export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

/**
 * The reminder job (spec 15.3 item 5): every tenant, every person whose reminder is due this run, one notification to
 * each of their phones, at most once a day. Runs as app_worker per tenant. Logs counts only.
 */
export async function sendDueReminders(now = new Date(), everyMinutes = 60) {
  if (!pushConfigured()) return { configured: false, sent: 0, people: 0, dropped: 0 };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const clock = storeClock(now, TZ);
  const tenants = (await pool().query<{ id: string }>("select id from tenants")).rows;
  let sent = 0;
  let people = 0;
  let dropped = 0;
  for (const tenant of tenants) {
    await withClient((client) =>
      withTenant(client, { tenantId: tenant.id, role: "app_worker" }, async (db) => {
        for (const c of await reminderCandidates(db, clock.day, TZ)) {
          if (!reminderDue({ chosen: c.reminderTime, weekday: clock.weekday, nowLocal: clock.time, sentToday: c.sentToday, practicedToday: c.practicedToday, peaks: c.peaks ?? undefined, everyMinutes })) continue;
          // Claim the day first, so two overlapping runs never send twice.
          if (!(await markReminderSent(db, tenant.id, c.userId, clock.day, c.subscriptions.length))) continue;
          people += 1;
          const payload = JSON.stringify({ title: t("push.title", c.language), body: t("push.body", c.language), url: "/" });
          for (const sub of c.subscriptions) {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 3600, urgency: "normal" });
              sent += 1;
            } catch (error) {
              const status = (error as { statusCode?: number }).statusCode;
              if (status === 404 || status === 410) {
                await dropPushSubscription(db, sub.endpoint);
                dropped += 1;
              } else log("warn", "push_failed", { status: status ?? null, error: errorField(error) });
            }
          }
        }
      }),
    );
  }
  log("info", "reminders", { people, sent, dropped, tenants: tenants.length });
  return { configured: true, sent, people, dropped };
}
