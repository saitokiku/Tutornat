'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { safePaths, externalCluster } = require('./paths.cjs');

async function external(action, paths) {
  const { owner, serverIdentity, ROLES, HOUSEHOLDS } = require('./harness.cjs');
  const client = await owner();
  const schemas = ['e2', 'e2_migrations'];
  const logins = HOUSEHOLDS.flatMap(h => ROLES.map(r => `e2_${h}_${r}`));
  const roles = [...ROLES, 'e2_writer', 'e1_fixture', ...logins];
  try {
    const observed = await serverIdentity(client);
    const pinned = fs.readFileSync(path.join(paths.directory, 'PG_VERSION'), 'utf8').trim();
    const expected = Number(pinned.split('.')[0]) * 10000 + Number(pinned.split('.')[1]);
    if (Number(observed.version_num) !== expected) throw new Error(`required PostgreSQL ${pinned}; observed ${observed.version}`);
    console.log(JSON.stringify({ server: observed }));
    const identity = (await client.query(`SELECT system_identifier::text AS system,
      (SELECT oid FROM pg_database WHERE datname=current_database()) AS database_oid,
      current_database() AS database, session_user AS owner FROM pg_control_system()`)).rows[0];
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('e2:cluster-lifecycle',0))");
    let state = fs.existsSync(paths.state) ? JSON.parse(fs.readFileSync(paths.state, 'utf8')) : null;
    if (state && JSON.stringify(state.identity) !== JSON.stringify(identity)) throw new Error('external cleanup receipt belongs to a different server/database/owner');
    const lookup = async (kind, name) => (await client.query(kind === 'schema'
      ? 'SELECT oid FROM pg_namespace WHERE nspname=$1'
      : 'SELECT oid FROM pg_roles WHERE rolname=$1', [name])).rows[0]?.oid;
    if (state) {
      for (const object of state.created) {
        if (!(object.kind === 'schema' ? schemas : object.kind === 'role' ? roles : []).includes(object.name)) throw new Error('invalid object in cleanup receipt');
        const oid = await lookup(object.kind, object.name);
        if (oid !== undefined && oid !== object.oid) throw new Error(`refusing to touch replaced ${object.kind}: ${object.name}`);
        if (action === 'up' && oid === undefined) throw new Error('incomplete prior run; use down to clear its receipt before up');
      }
    }
    if (action === 'up' && !state) {
      state = { identity, created: [] };
      for (const name of schemas) {
        if (await lookup('schema', name) !== undefined) continue;
        await client.query(`CREATE SCHEMA ${name}`);
        await client.query(`REVOKE ALL ON SCHEMA ${name} FROM PUBLIC`);
        state.created.push({ kind: 'schema', name, oid: await lookup('schema', name) });
      }
      for (const name of roles) {
        if (await lookup('role', name) !== undefined) continue;
        await client.query(`CREATE ROLE ${name} ${logins.includes(name) ? 'LOGIN' : 'NOLOGIN'} NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
        state.created.push({ kind: 'role', name, oid: await lookup('role', name) });
      }
      // Persist the exact OIDs before COMMIT. On interruption, down can safely
      // handle either the committed objects or a rolled-back, empty transaction.
      safePaths();
      fs.writeFileSync(paths.state, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    } else if (action === 'down' && state) {
      for (const object of state.created) {
        if (await lookup(object.kind, object.name) === undefined) continue;
        // Never DROP OWNED: role dependencies outside our schemas must refuse
        // cleanup, rather than deleting another caller's objects or grants.
        await client.query(object.kind === 'schema'
          ? `DROP SCHEMA ${object.name} CASCADE` : `DROP ROLE ${object.name}`);
      }
    }
    await client.query('COMMIT');
    if (action === 'down' && state) { safePaths(); fs.unlinkSync(paths.state); }
    console.log(JSON.stringify({ external: action, createdByRun: state?.created ?? [],
      result: action === 'up' ? 'schema and roles ready; next: node db/migrate.cjs' : 'created objects dropped; pre-existing objects retained; server left running' }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { await client.end(); }
}

async function main(action) {
  if (!['up', 'down'].includes(action)) throw new Error('usage: cluster.cjs up|down');
  const paths = safePaths();
  if (externalCluster()) return external(action, paths);
  if (action === 'up' && process.env.LC_ALL !== 'en_US.UTF-8') {
    throw new Error('self-managed PostgreSQL requires an unsandboxed operator and LC_ALL=en_US.UTF-8');
  }
  const binaryDirectory = process.env.E2_PG_BIN || '/usr/local/opt/postgresql@17/bin';
  const version = fs.readFileSync(path.join(paths.directory, 'PG_VERSION'), 'utf8').trim();
  // Do not inherit provider connection settings, passwords, service files or options.
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
  environment.PGPASSFILE = '/dev/null';
  const invoke = (program, args, { capture = false, accept = [0] } = {}) => {
    const result = spawnSync(path.join(binaryDirectory, program), args, {
      env: environment, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    });
    if (result.error) throw result.error;
    if (!accept.includes(result.status)) {
      const error = new Error(`${program} exited ${result.status}; PostgreSQL operational failure (no database assertion proven)`);
      error.exitCode = result.status || 1;
      throw error;
    }
    return result;
  };
  const installed = invoke('postgres', ['--version'], { capture: true }).stdout.trim();
  if (!new RegExp(`\\b${version.replaceAll('.', '\\.')}\\b`).test(installed)) throw new Error(`required PostgreSQL ${version}; observed ${installed}`);
  console.log(`PostgreSQL version: ${installed}; pinned=${version}`);
  const connection = ['-h', paths.socket, '-p', '55417', '-U', 'e2_owner', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1'];
  const observeServer = () => {
    const result = invoke('psql', [...connection, '-Atc', "SELECT json_build_object('role',current_user,'version',current_setting('server_version_num'),'listen',current_setting('listen_addresses'),'socket',current_setting('unix_socket_directories'),'data',current_setting('data_directory'))"], { capture: true });
    const observed = JSON.parse(result.stdout.trim());
    const expectedVersion = Number(version.split('.')[0]) * 10000 + Number(version.split('.')[1]);
    if (observed.role !== 'e2_owner' || Number(observed.version) !== expectedVersion || observed.listen !== '' || observed.socket !== paths.socket || observed.data !== paths.data) {
      throw new Error(`server identity/settings do not match isolated fixture: ${JSON.stringify(observed)}`);
    }
    console.log(`Observed harness server: ${JSON.stringify(observed)}`);
  };

  const clusterVersion = path.join(paths.data, 'PG_VERSION');
  if (action === 'down') {
    if (!fs.existsSync(clusterVersion)) {
      console.log('No initialized harness cluster observed; nothing to stop.');
      return;
    }
    const status = invoke('pg_ctl', ['-D', paths.data, 'status'], { capture: true, accept: [0, 3] });
    if (status.status === 3) { console.log('Initialized harness cluster is stopped.'); return; }
    observeServer();
    invoke('pg_ctl', ['-D', paths.data, '-m', 'fast', '-w', '-t', '15', 'stop']);
    return;
  }

  if (!fs.existsSync(clusterVersion)) {
    if (fs.existsSync(paths.data) && fs.readdirSync(paths.data).length) throw new Error('uninitialized data directory is nonempty; refusing to replace it');
    invoke('initdb', ['-D', paths.data, '-U', 'e2_owner', '--auth-local=trust', '--auth-host=reject', '--encoding=UTF8', '--locale=en_US.UTF-8']);
  }
  if (fs.readFileSync(clusterVersion, 'utf8').trim() !== version.split('.')[0]) throw new Error('cluster major version does not match PG_VERSION');
  safePaths();
  fs.mkdirSync(paths.socket, { recursive: true, mode: 0o700 });
  fs.chmodSync(paths.socket, 0o700);
  const status = invoke('pg_ctl', ['-D', paths.data, 'status'], { capture: true, accept: [0, 3] });
  if (status.status === 3) {
    const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
    const options = ['-c', 'listen_addresses=', '-c', `unix_socket_directories=${paths.socket}`, '-c', 'unix_socket_permissions=0700', '-p', '55417'].map(quote).join(' ');
    invoke('pg_ctl', ['-D', paths.data, '-l', paths.log, '-o', options, '-w', '-t', '15', 'start']);
  }
  observeServer();
  const present = invoke('psql', [...connection, '-Atc', "SELECT 1 FROM pg_database WHERE datname = 'e2_contract'"], { capture: true }).stdout.trim();
  if (present !== '1') invoke('psql', [...connection, '-c', 'CREATE DATABASE e2_contract OWNER e2_owner']);
  console.log('Harness database ready: e2_contract. Next: node db/migrate.cjs');
}

if (require.main === module) {
  main(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = error.exitCode || 1;
  });
}

module.exports = { main };
