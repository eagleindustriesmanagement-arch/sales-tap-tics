import type { Queryable } from "./context.js";
import type { UserContext } from "./repo.js";

/** A browser's Web Push subscription (decision 0022). */
export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Saves this phone for the signed-in person. A phone already saved for someone else stays theirs. */
export async function savePushSubscription(db: Queryable, user: UserContext, sub: PushSubscriptionRow): Promise<void> {
  await db.query(
    `insert into push_subscriptions (tenant_id, user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4, $5)
     on conflict (endpoint) do nothing`,
    [user.tenantId, user.id, sub.endpoint, sub.p256dh, sub.auth],
  );
}

/** Removes one of the signed-in person's phones (row-level security keeps it to their own). */
export async function removePushSubscription(db: Queryable, endpoint: string): Promise<void> {
  await db.query("delete from push_subscriptions where endpoint = $1 and user_id = app.user_id()", [endpoint]);
}

export interface ReminderCandidate {
  userId: string;
  language: "en" | "es";
  reminderTime: string;
  sentToday: boolean;
  practicedToday: boolean;
  subscriptions: PushSubscriptionRow[];
}

/**
 * For the reminder job (app_worker, one tenant): active people with a reminder time and at least one phone, whether a
 * reminder already went out today and whether they already practiced today, in the store's time zone.
 */
export async function reminderCandidates(db: Queryable, day: string, timeZone = "America/New_York"): Promise<ReminderCandidate[]> {
  const r = await db.query<{ user_id: string; preferred_language: "en" | "es"; reminder_time: string; sent_today: boolean; practiced_today: boolean; subs: PushSubscriptionRow[] }>(
    `select u.id user_id, u.preferred_language, to_char(u.reminder_time, 'HH24:MI') reminder_time,
            exists (select 1 from reminders_sent r where r.user_id = u.id and r.day = $1::date) sent_today,
            exists (select 1 from sessions s where s.user_id = u.id and (s.started_at at time zone $2)::date = $1::date) practiced_today,
            (select json_agg(json_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)) from push_subscriptions p where p.user_id = u.id) subs
     from users u
     where u.status = 'active' and u.reminder_time is not null and exists (select 1 from push_subscriptions p where p.user_id = u.id)`,
    [day, timeZone],
  );
  return r.rows.map((row) => ({ userId: row.user_id, language: row.preferred_language, reminderTime: row.reminder_time, sentToday: row.sent_today, practicedToday: row.practiced_today, subscriptions: row.subs ?? [] }));
}

/** Records today's reminder, so a person never gets two in a day. Returns false if one was already recorded. */
export async function markReminderSent(db: Queryable, tenantId: string, userId: string, day: string, devices: number): Promise<boolean> {
  const r = await db.query("insert into reminders_sent (tenant_id, user_id, day, devices) values ($1, $2, $3, $4) on conflict (user_id, day) do nothing", [tenantId, userId, day, devices]);
  return (r.rowCount ?? 0) > 0;
}

/** A phone the push service says is gone (404 or 410) is removed. */
export async function dropPushSubscription(db: Queryable, endpoint: string): Promise<void> {
  await db.query("delete from push_subscriptions where endpoint = $1", [endpoint]);
}
