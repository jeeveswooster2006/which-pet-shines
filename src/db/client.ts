import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// A single pooled connection reused across hot-reloads in dev and across
// invocations in a long-lived server process. On serverless platforms with
// their own pooler (Neon, Supabase, RDS Proxy) this still works fine — point
// DATABASE_URL at the pooled connection string.
declare global {
   
  var __wpsPool: Pool | undefined;
}

const pool =
  global.__wpsPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__wpsPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
