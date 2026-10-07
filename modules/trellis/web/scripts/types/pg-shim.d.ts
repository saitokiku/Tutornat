// Minimal shape of `pg` for the offline local typecheck only (scripts/tsconfig.local.json).
// Vercel installs the real @types/pg; this file is outside web/tsconfig.json's include.
declare module "pg" {
  export interface QueryResult<R = any> { rows: R[]; rowCount: number | null }
  export interface PoolClient {
    query<R = any>(sql: string, params?: unknown[]): Promise<QueryResult<R>>;
    release(): void;
  }
  export class Pool {
    constructor(config: { connectionString?: string; max?: number; application_name?: string });
    connect(): Promise<PoolClient>;
    query<R = any>(sql: string, params?: unknown[]): Promise<QueryResult<R>>;
    on(event: "connect", listener: (client: PoolClient) => void): this;
  }
}
declare var process: { env: Record<string, string | undefined> };
declare function fetch(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ ok: boolean; json(): Promise<unknown> }>;
