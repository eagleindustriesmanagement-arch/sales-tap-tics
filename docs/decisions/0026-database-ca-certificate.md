# 0026: Verify the database's certificate with the host's CA

- **Context.**
  - Vercel's Supabase integration adds `sslmode=require` to its connection strings. The Postgres driver (pg 8,
    pg-connection-string 2.14) treats `require` as "verify the certificate against Node's trusted CAs".
  - Supabase signs its database certificates with its own CA, which Node does not trust. A connection from the
    deploy step or the app then fails with "unable to verify the first certificate" or "self-signed certificate in
    certificate chain".
  - The usual workaround turns verification off (`sslmode=no-verify` or `rejectUnauthorized: false`), which leaves
    the connection open to a man-in-the-middle.
  - The driver also lets SSL settings in the URL override any passed in code.
- **Decision.**
  - **`DATABASE_CA_CERT`.** An optional environment variable holding the host's CA certificate (PEM; escaped
    `\n` is accepted, for single-line variables).
  - **When it is set,** every connection (the app's pool, the deploy step, the seed and the content release)
    verifies the server against that CA, with `rejectUnauthorized: true`. The URL's `sslmode` and related settings
    are removed so they cannot override it.
  - **When it is not set,** the URL is used as it is.
  - **Verification is never turned off by the app.**
- **Verified locally.** A Postgres server with a certificate from a private CA refused `sslmode=require` without
  the CA, connected and verified with `DATABASE_CA_CERT`, connected with the CA given as one line with `\n`, and
  refused a wrong CA.
- **Consequence.** If the first Supabase deploy fails with a certificate error, add the project's CA certificate
  (Supabase dashboard: Database settings, SSL configuration, Download certificate) to Vercel as `DATABASE_CA_CERT`
  for Production and Preview, then redeploy.
