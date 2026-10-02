import pg from "pg";
import { migrate } from "./migrate.js";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const applied = await migrate(client);
console.log(applied.length ? `applied: ${applied.join(", ")}` : "database is up to date");
await client.end();
