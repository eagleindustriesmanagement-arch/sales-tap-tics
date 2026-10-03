# 0020: Product analytics come from the app's own database, counts only

- **Context.**
  - Spec 19.4 lists what to track per tenant and store:
    - sessions started and completed;
    - time to first session after invite;
    - daily and weekly active reps;
    - debrief opens and demonstration skips;
    - behavior card checks;
    - average turn latency by stage;
    - recognition confidence by language;
    - model cost per session.
  - It also says never to send transcript text to analytics tools.
  - It names no analytics vendor. Adding one would mean an account, a cost, and personal data leaving the app.
- **Decision.**
  - **No outside analytics tool.** Every measure comes from tables the app already keeps: sessions, turns, model
    usage, behavior cards and users.
  - **Two new fields**, recorded by the app:
    - `sessions.demo_watched`: whether the rep opened the demonstration before starting;
    - `sessions.debrief_seen_at`: when the rep first saw the debrief, inline or from history.
  - **How the general manager reads it.** One security-definer function, `app.store_usage(store, since)`, returns
    counts, medians and averages, and nothing else. It includes sessions inside reps' private windows, but never a
    row, a name or any text. It returns null for anyone but the store's general manager.
  - **The Usage page** (`/manager/usage`, linked from the dashboard) shows the last 28 days:
    - sessions started and finished;
    - reps practicing this week and per day;
    - debriefs read, demos watched first and behavior cards checked;
    - median hours from invite to first session, and reps who never practiced;
    - spoken sessions, the median pause, and recognition confidence by language;
    - AI cost per session and model response time by purpose;
    - a weekly table.
  - **Turn latency.** Recognition and speech-synthesis time are not measured yet: the device does both. Until the
    cloud voice tier (decision 0013) adds those stages, "turn latency by stage" is the model's response time and
    time to first word, by purpose.
- **Consequence.**
  - Nothing leaves the app, and no tool or vendor bill is added.
  - Product analytics across tenants (for the vendor) would read the same function as a service role. It is not
    built, because there is one tenant.
