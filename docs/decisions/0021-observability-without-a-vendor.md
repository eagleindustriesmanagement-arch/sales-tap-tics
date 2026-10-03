# 0021: Observability with structured logs and a health check, no vendor

- **Context.**
  - M7 asks for observability (traces, alerting). STATUS had it waiting on the hosting choice. Hosting is now
    Vercel (decision 0014), which keeps every function's stdout and stderr as searchable runtime logs, and can
    forward them through a log drain.
  - An error-tracking or tracing vendor would need an account and a bill, and it could receive personal data.
- **Decision.**
  - **`apps/web/lib/log.ts`** writes one JSON line per event: time, level, event, then fields.
    - Fields are codes, numbers and ids only. A string that looks like an email or a phone number is replaced
      with `[redacted]`. A field name outside the camelCase set is dropped.
    - Never a name, an email, a phone number, or anything a rep or customer said (spec 19.4, 20.2).
  - **Every server error** goes through Next's `onRequestError` hook as `request_failed`, with the method, the
    route, the route kind, the error's class and message and its digest. The request body is never logged.
  - **Each turn** logs `turn`: session id, scenario, live or offline, spoken or typed, time to the first customer
    sentence, total time, and whether the session ended. A failed turn logs `turn_failed`.
  - **`/api/health`** is for uptime monitors. It returns `ok`, `database`, the number of scenarios loaded,
    `liveAi` and its own time, with a 503 when the database or the content library is down. It is public and
    holds no data.
- **Consequence.**
  - Slow turns and errors can be searched in Vercel's logs by event name.
  - Alerting is the host's: a Vercel log alert, or any uptime monitor on `/api/health`. Choosing one is an
    account decision for the owner.
  - Turn latency from the customer's side (recognition and speech) is still measured only in the browser.
