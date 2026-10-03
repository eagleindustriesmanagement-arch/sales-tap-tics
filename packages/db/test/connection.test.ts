import { describe, expect, it } from "vitest";
import { pgConfig } from "../src/index.js";

const url = "postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x";

describe("database connection settings (decision 0026)", () => {
  it("uses the URL as it is without a CA certificate", () => {
    expect(pgConfig(url, {})).toEqual({ connectionString: url });
  });

  it("verifies against DATABASE_CA_CERT, with the URL's SSL settings removed so they cannot override it", () => {
    const pem = "-----BEGIN CERTIFICATE-----\\nAAA\\n-----END CERTIFICATE-----";
    const c = pgConfig(url, { DATABASE_CA_CERT: pem });
    expect(c.ssl).toEqual({ ca: "-----BEGIN CERTIFICATE-----\nAAA\n-----END CERTIFICATE-----", rejectUnauthorized: true });
    expect(c.connectionString).not.toContain("sslmode");
    expect(c.connectionString).toContain("supa=base-pooler.x");
  });
});
