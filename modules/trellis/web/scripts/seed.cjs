#!/usr/bin/env node
// Seed one synthetic household for the web surface. Idempotent. Runs as the owner
// (KAIZENEDU_PG_URL) after ../db/migrate.cjs. Synthetic names only ("Ada, 9", "Parent").
// Creates two LOGIN roles the app connects as (tutor / report capability, household "home");
// on Neon set KAIZENEDU_APP_PASSWORD so they can log in.
'use strict';
const path = require('node:path');
const { resolvePg } = require('../../tests/engine/pg/resolve-pg.cjs');

const HOUSEHOLD = 'home';
const LEARNER = 'ada';
const SKILL = 'frac-add-unlike';
const RULE = 'e2-draft-1';
const RUBRIC = 'syn-frac-exact';
const ITEMS = [
  ['syn-frac-add-1', 'Ada has 1/2 of a pizza and finds 1/4 more. How much pizza is that altogether?', { n: 3, d: 4 }, 'pizza'],
  ['syn-frac-add-2', 'A ribbon is 1/3 m. Another is 1/6 m. Laid end to end, how long are they?', { n: 1, d: 2 }, 'ribbon'],
  ['syn-frac-add-3', '2/5 of the class likes green, 3/10 likes blue. What fraction likes green or blue?', { n: 7, d: 10 }, 'survey'],
];
const ROLES = [['kz_home_tutor', 'tutor'], ['kz_home_report', 'report']];

async function main() {
  const url = process.env.KAIZENEDU_PG_URL;
  if (!url) throw new Error('KAIZENEDU_PG_URL is not set');
  const { pg } = resolvePg();
  const c = new pg.Client({ connectionString: url, application_name: 'kaizenedu-web-seed' });
  await c.connect();
  try {
    await c.query('BEGIN');
    await c.query('INSERT INTO e2.households(household_id,timezone) VALUES($1,$2) ON CONFLICT DO NOTHING', [HOUSEHOLD, 'America/Chicago']);
    await c.query('INSERT INTO e2.learners(household_id,id) VALUES($1,$2) ON CONFLICT DO NOTHING', [HOUSEHOLD, LEARNER]);
    await c.query('INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [HOUSEHOLD, RULE, { delayHours: 48, quietWindowReps: 10, escalationDays: 14, daySeven: [6, 9], certification: false }, { source: 'synthetic-fixture', seed: 'web/scripts/seed.cjs' }]);
    await c.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES($1,$2,'1','approved',$3,$4) ON CONFLICT DO NOTHING",
      [HOUSEHOLD, RUBRIC, { method: 'fraction-equality' }, { review: 'synthetic' }]);
    for (const [id, prompt, answer, context] of ITEMS) {
      await c.query("INSERT INTO e2.items(household_id,id,version,key_version,rubric_id,rubric_version,skill_id,skill_version,family_id,context_tag,approval,content,answer_key,provenance) VALUES($1,$2,'1','1',$3,'1',$4,'1',$5,$6,'approved',$7,$8,$9) ON CONFLICT DO NOTHING",
        [HOUSEHOLD, id, RUBRIC, SKILL, 'syn-frac-add', context, { prompt, operation: 'add', operands: 2 }, { answer }, { review: 'synthetic', lesson: 'frac-add-unlike' }]);
    }
    for (const [login, role] of ROLES) {
      const found = await c.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [login]);
      if (found.rowCount === 0) await c.query(`CREATE ROLE ${login} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
      if (process.env.KAIZENEDU_APP_PASSWORD) {
        const pw = process.env.KAIZENEDU_APP_PASSWORD.replaceAll("'", "''");
        await c.query(`ALTER ROLE ${login} PASSWORD '${pw}'`);
      }
      await c.query(`GRANT ${role} TO ${login}`);
      await c.query('INSERT INTO e2.principals(login,household_id) VALUES($1,$2) ON CONFLICT (login) DO UPDATE SET household_id=EXCLUDED.household_id', [login, HOUSEHOLD]);
    }
    await c.query('COMMIT');
    const counts = (await c.query("SELECT (SELECT count(*) FROM e2.items WHERE household_id=$1) AS items,(SELECT count(*) FROM e2.principals WHERE household_id=$1) AS principals,current_database() AS db", [HOUSEHOLD])).rows[0];
    console.log(JSON.stringify({ seed: 'ok', household: HOUSEHOLD, learner: LEARNER, skill: SKILL, ...counts }));
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
