// Two pools, two capabilities. The seam derives the household from session_user
// (e2.principals), so the tutor path and the report path connect as different LOGIN roles.
// Callers never take locks (ADR-0066); every seam call is one SQL statement in one transaction.
import { Pool, type PoolClient } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __kzPools: { tutor?: Pool; report?: Pool } | undefined;
}

const pools = (globalThis.__kzPools ??= {});

// The seeded LOGIN roles are NOINHERIT members of one capability role (db/README.md), so each
// connection assumes that capability with SET ROLE. session_user stays the login, which is
// what e2.household_id() reads.
function make(url: string | undefined, name: string, capability: "tutor" | "report"): Pool {
  if (!url) throw new Error(`${name} is not set`);
  const pool = new Pool({ connectionString: url, max: 3, application_name: "kaizenedu-web" });
  pool.on("connect", (client) => { void client.query(`SET ROLE ${capability}`); });
  return pool;
}

export function tutorPool(): Pool {
  return (pools.tutor ??= make(process.env.KAIZENEDU_PG_TUTOR_URL, "KAIZENEDU_PG_TUTOR_URL", "tutor"));
}

export function reportPool(): Pool {
  return (pools.report ??= make(process.env.KAIZENEDU_PG_REPORT_URL, "KAIZENEDU_PG_REPORT_URL", "report"));
}

export function dbConfigured(): boolean {
  return Boolean(process.env.KAIZENEDU_PG_TUTOR_URL && process.env.KAIZENEDU_PG_REPORT_URL);
}

// One seam call per transaction; retry serialization failures (db/README.md).
export async function seamCall<T>(pool: Pool, sql: string, params: unknown[], retries = 3): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        const r = await client.query(sql, params);
        await client.query("COMMIT");
        return r.rows[0]?.value as T;
      } catch (error) {
        await client.query("ROLLBACK");
        const code = (error as { code?: string }).code;
        if (!(code === "40001" || code === "40P01") || attempt >= retries) throw error;
      }
    }
  } finally {
    client.release();
  }
}
