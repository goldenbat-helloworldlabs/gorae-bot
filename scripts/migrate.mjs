// Applies schema.sql to the Postgres database pointed to by POSTGRES_URL.
// Run `vercel env pull .env.local` first, then:
//   node --env-file=.env.local scripts/migrate.mjs
import { createClient } from "@vercel/postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const schemaPath = fileURLToPath(new URL("../schema.sql", import.meta.url));
const schema = readFileSync(schemaPath, "utf8");

const client = createClient();
await client.connect();
await client.query(schema);
await client.end();

console.log("Schema applied.");
