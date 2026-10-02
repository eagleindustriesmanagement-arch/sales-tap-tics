# 0007: Published content is stored as validated documents; migrations are plain SQL

- **Context.** Spec 6.2 lists one table per content kind with their key fields, and 5.1 allows Prisma or Drizzle.
  The fields are exactly the YAML schemas in `packages/content`, which already validate every file.
- **Decision.** Published releases go to `content_releases` and `content_items(kind, code, body jsonb)`, one row per
  validated file, immutable after insert, with platform rows readable by every tenant. Migrations are plain SQL run by
  a small runner (`packages/db/src/migrate.ts`), because row-level security policies, security-definer functions and
  immutability triggers are the core of this schema and read most clearly as SQL.
- **Consequence.** One definition of each content field (the Zod schema), no drift between YAML, database and code.
  If a dashboard needs to query a content field often, add an expression index or a generated column, not a copy.
