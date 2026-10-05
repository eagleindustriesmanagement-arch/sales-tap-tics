# 0039: A row never ties one company's person or store to another company

- **Context.** Row-level security (decision 0002, spec 3.3) isolates every read by tenant, and limits writes to
  rows carrying the writer's own tenant. On October 5 a new browser test aimed every id-taking API route at another
  company's records (spec 21.1). Reads were all refused. Two writes were not: a general manager could give a role to
  another company's user (a membership row in their own company naming that user) and could then assign that user
  practice. The victim saw and gained nothing, since their sign-in loads only their own company's rows, but the
  database held rows that crossed companies.
- **Decision.**
  - **In the database (migration 0022).** `users (id, tenant_id)` and `stores (id, tenant_id)` are unique pairs,
    and every company table that names a person or a store references the pair: (person, tenant) and (store,
    tenant). A row whose person or store belongs to another company is refused, whatever the application does.
    The keys are `NOT VALID`: enforced for every new or changed row, without failing a deploy over a historical
    row (the shared Preview and Production database, decision 0025).
  - **In the application.** Roles change only for someone already in the manager's store; assignments only for
    reps on their team. Both refuse before anything is written, with a plain error, rather than relying on the
    database's.
- **Proof.** A database test refuses a membership, a store reference and a behavior card that cross companies,
  and accepts the same rows inside one company. The browser test refuses every route aimed at the other company,
  checks the other company's data is unchanged, and counts crossing rows (none).
- **Follow-up.** After a quiet period, `alter table ... validate constraint` on each key would prove the historical
  rows too; it is safe to run when no crossing row exists.
