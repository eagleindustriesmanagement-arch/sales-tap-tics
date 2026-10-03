import type { ClientConfig } from "pg";

/**
 * Connection settings for a database URL (decision 0026). Hosts such as Supabase sign their certificates with their
 * own CA, which Node does not trust, and the driver treats `sslmode=require` as "verify against Node's CAs". With
 * DATABASE_CA_CERT (the host's CA certificate, PEM) the connection verifies against that CA instead; the URL's own
 * SSL settings are removed, because the driver lets them override the ones given here. Without it, the URL is used
 * as it is. Verification is never turned off.
 */
export function pgConfig(url: string, env: Record<string, string | undefined> = process.env): ClientConfig {
  const ca = env["DATABASE_CA_CERT"]?.replace(/\\n/g, "\n").trim();
  if (!ca) return { connectionString: url };
  const u = new URL(url);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) u.searchParams.delete(key);
  return { connectionString: u.toString(), ssl: { ca, rejectUnauthorized: true } };
}
