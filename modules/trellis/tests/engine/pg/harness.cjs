'use strict';

const { safePaths, externalCluster } = require('./paths.cjs');
const { resolvePg } = require('./resolve-pg.cjs');

const ROLES = Object.freeze(['learner', 'tutor', 'report', 'assessment']);
const HOUSEHOLDS = Object.freeze(['h1', 'h2']);
const capabilities = new WeakMap();
const busy = new WeakSet();

function connectionConfig({ user, applicationName = 'e2-harness' } = {}) {
  if (!externalCluster() && Object.keys(process.env).some((key) => key.startsWith('PG'))) {
    throw new Error('local harness refuses inherited PG environment settings');
  }
  let target = { host: safePaths().socket, port: 55417, database: 'e2_contract', user: 'e2_owner',
    password: () => { throw new Error('local harness refuses password authentication'); }, ssl: false };
  if (externalCluster()) {
    // pg's parser handles URI escaping and SSL parameters. Do not pass a
    // connectionString to Client: it would override the capability login below.
    const { pg } = resolvePg();
    const parsed = new pg.Client(process.env.KAIZENEDU_PG_URL
      ? { connectionString: process.env.KAIZENEDU_PG_URL } : {}).connectionParameters;
    target = { host: parsed.host, port: parsed.port, database: parsed.database,
      user: parsed.user, password: parsed.password, ssl: parsed.ssl };
  }
  return {
    ...target,
    user: user ?? target.user,
    options: '-c statement_timeout=15000 -c lock_timeout=10000',
    application_name: applicationName,
    connectionTimeoutMillis: 3000,
    statement_timeout: 15000,
    lock_timeout: 10000,
  };
}

async function newClient(options) {
  const { pg } = resolvePg();
  const client = new pg.Client(connectionConfig(options));
  try {
    await client.connect();
    return client;
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}

async function owner() {
  return newClient({ applicationName: 'e2-owner-fixture' });
}

async function serverIdentity(client) {
  const observed = (await client.query(`SELECT version() AS version,
    current_setting('server_version_num') AS version_num,
    inet_server_addr()::text AS host, inet_server_port() AS port,
    current_database() AS database, session_user AS login, pg_backend_pid() AS pid`)).rows[0];
  const config = connectionConfig();
  return { mode: externalCluster() ? 'external' : 'managed',
    target: { host: config.host, port: config.port, database: config.database, user: config.user }, ...observed };
}

async function connect({ household = 'h1', role = 'learner' } = {}) {
  if (!HOUSEHOLDS.includes(household) || !ROLES.includes(role)) throw new TypeError('unknown fixture household or role');
  const client = await newClient({ user: `e2_${household}_${role}`, applicationName: `e2-${household}-${role}` });
  try {
    await client.query(`SET ROLE ${role}`);
    const identity=(await client.query('SELECT current_user AS role,session_user AS login,e2.household_id() AS household,pg_backend_pid() AS pid')).rows[0];
    if(identity.role!==role||identity.login!==`e2_${household}_${role}`||identity.household!==household)throw new Error('fixture connection identity mismatch');
    Object.defineProperty(client,'fixtureIdentity',{value:Object.freeze(identity)});
    capabilities.set(client, role);
    return client;
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}

async function open({ count = 4, household = 'h1' } = {}) {
  if (!Number.isInteger(count) || count < 4) throw new TypeError('harness requires at least four independent connections');
  const clients = [];
  try {
    for (let i = 0; i < count; i += 1) clients.push(await connect({ household, role: ROLES[i % ROLES.length] }));
    return {
      clients,
      async close() { await Promise.all(clients.map((client) => client.end())); },
    };
  } catch (error) {
    await Promise.all(clients.map((client) => client.end().catch(() => {})));
    throw error;
  }
}

// Fixture setup is deliberately owner-only. Household rows must exist first.
// Production provisioning is out of scope; these synthetic LOGINs use local trust.
async function provisionPrincipals(admin) {
  for (const household of HOUSEHOLDS) {
    for (const role of ROLES) {
      const login = `e2_${household}_${role}`;
      const found = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [login]);
      if (found.rowCount === 0) await admin.query(`CREATE ROLE ${login} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
      await admin.query(`ALTER ROLE ${login} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
      const memberships = await admin.query(
        'SELECT parent.rolname FROM pg_auth_members membership JOIN pg_roles parent ON parent.oid = membership.roleid JOIN pg_roles member ON member.oid = membership.member WHERE member.rolname = $1',
        [login],
      );
      for (const membership of memberships.rows) {
        const quotedRole = '"' + membership.rolname.replaceAll('"', '""') + '"';
        await admin.query(`REVOKE ${quotedRole} FROM ${login}`);
      }
      await admin.query(`GRANT ${role} TO ${login}`);
      await admin.query(
        'INSERT INTO e2.principals (login, household_id) VALUES ($1, $2) ON CONFLICT (login) DO UPDATE SET household_id = EXCLUDED.household_id',
        [login, household],
      );
    }
  }
}

// The callback can run again only for PostgreSQL serialization/deadlock errors.
// Keep provider calls outside this callback; retries must replay database work.
async function transaction(client, callback, { role = capabilities.get(client), isolation = 'serializable', retries = 3 } = {}) {
  if (!['serializable', 'read committed', 'repeatable read'].includes(isolation)) throw new TypeError('invalid isolation level');
  if (role !== undefined && !ROLES.includes(role)) throw new TypeError('invalid transaction role');
  if (capabilities.has(client) && role !== capabilities.get(client)) throw new TypeError('transaction role differs from connection capability');
  if (!Number.isInteger(retries) || retries < 0 || retries > 20) throw new TypeError('retries must be an integer from 0 to 20');
  if (busy.has(client)) throw new Error('one transaction at a time per connection');
  busy.add(client);
  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        await client.query(`BEGIN ISOLATION LEVEL ${isolation.toUpperCase()}`);
        if (role !== undefined) await client.query(`SET LOCAL ROLE ${role}`);
        const value = await callback(client, attempt);
        await client.query('COMMIT');
        return value;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch (rollbackError) {
          error.rollbackError = rollbackError;
          throw error;
        }
        if (!['40001', '40P01'].includes(error.code) || attempt >= retries) throw error;
      }
    }
  } finally {
    busy.delete(client);
  }
}

module.exports = { ROLES, HOUSEHOLDS, connectionConfig, serverIdentity, owner, connect, open, newClient, provisionPrincipals, transaction, withTransaction: transaction };
