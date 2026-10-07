// Durable lesson archive. One JSON file per archived lesson, named by the fingerprint of
// the request that produced it, under an owner-only directory outside the deployment
// tree.
//
// WHY PLAIN FILES AND NOT node:sqlite: both are stdlib on this Node, and SQLite was
// probed as present (node:sqlite exposes DatabaseSync here). It was still not used: the
// only operations this needs are put-if-absent, get-by-key and count, and `link()` gives
// put-if-absent atomically and immutably in a single syscall, with no schema, no
// migration and no dependence on a build flag that `--without-sqlite` can remove. Add
// SQLite when a query this cannot answer (search, listing by date, retention sweeps) is
// actually required.
//
// WHAT IS NOT HERE, DELIBERATELY: no TTL, no eviction, no size cap, no background
// compaction. Nothing deletes a record. Retention is a product decision nobody has made
// yet, and a cache that silently drops a lesson the owner is mid-way through is worse
// than a directory that grows by ~8KB per lesson.
import { createHash } from 'node:crypto';
import { mkdirSync, chmodSync, writeFileSync, readFileSync, unlinkSync, linkSync,
  renameSync, readdirSync, statSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { join } from 'node:path';

/** Bump when the stored shape changes meaning: old records then simply stop matching. */
export const STORE_VERSION = 1;

/**
 * Stable fingerprint of everything that changes what the model was asked for. Object key
 * ORDER must not change the answer, so keys are sorted at every depth — otherwise the
 * same request typed in a different field order would generate a second time.
 */
export function lessonKey(fingerprint) {
  return createHash('sha256').update(canonical(fingerprint)).digest('hex');
}

function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}

/** Thrown for storage faults only. The server maps .code to a typed HTTP status. */
export class LessonStoreError extends Error {
  constructor(code, message) { super(message); this.name = 'LessonStoreError'; this.code = code; }
}

/** Only the errno token is ever reported: e.message embeds the path it tried. */
const safeCode = (e) => (/^[A-Z]{2,16}$/.test(String(e?.code || '')) ? e.code : 'unknown');

const FULL = /^[0-9a-f]{64}\.json$/;
const KEY = /^[0-9a-f]{64}$/;
/** A voter token is a client-generated 128-bit lowercase-hex value and nothing else. */
const VOTER = /^[0-9a-f]{32}$/;
export const VOTES = ['up', 'down'];
export const FEEDBACK_SEMANTICS = 'self-reported-helpfulness';

/**
 * A key is interpolated into a FILE PATH, so it is validated at the boundary rather than
 * trusted because lessonKey() happens to produce hex. Anything else — traversal, upper
 * case, wrong length, a non-string — is a programming fault, not a miss.
 */
function checkKey(key) {
  if (typeof key !== 'string' || !KEY.test(key)) {
    throw new LessonStoreError('LessonKeyInvalid', 'A lesson key must be a 64-character hex digest.');
  }
  return key;
}

/**
 * Digest of the record's MEANING, so a byte-level edit to a valid-shaped record shows.
 * `generated_at` is deliberately EXCLUDED: it is the archival timestamp, not content, and
 * including it would give an identical re-run a different digest and therefore a
 * duplicate version file per attempt.
 */
function digestOf({ v, id, key, lesson, request, provenance, metadata }) {
  return createHash('sha256')
    // `metadata` is INSIDE the digest: it is a durability claim about what produced this
    // lesson (model identity, timing, the instructions actually sent), so an edit to it
    // must invalidate the record exactly as an edit to the lesson does.
    .update(canonical({ v, id, key, lesson, request, provenance, metadata }))
    .digest('hex');
}

/**
 * fsync the file AND its directory before returning. Without the directory sync the
 * link() that publishes the record can still be lost on a crash, which would make a 200
 * ("durably archived") a lie.
 *
 * A FAILED fsync PROPAGATES. Swallowing it was the actual bug: the save returned
 * "saved" and the route answered 200 while the bytes were only in page cache, so the
 * durability promise the 200 makes was unfounded.
 *
 * The ONE tolerated case is a platform that cannot fsync a DIRECTORY at all, which
 * announces itself with a specific errno — not "any directory error". The file fsync
 * still had to succeed, so the record's own bytes are on disk either way; only the
 * publishing link lacks a barrier.
 *
 * EBADF, EACCES, EPERM and EISDIR are NOT in that set, and including them was a bug:
 * a bad descriptor is a local defect and a permission refusal is a misconfigured
 * library, neither of which is evidence that the filesystem lacks directory fsync. They
 * were silently tolerated, so the route answered 200 ("durably archived") after the
 * publishing barrier had actually failed.
 *
 * ponytail: this is crash durability, not power-loss durability — it does not defeat a
 * lying disk write cache. Good enough for a local single-owner library; revisit if this
 * ever backs something that must survive a hard power cut.
 */
const DIR_FSYNC_UNSUPPORTED = new Set(['EINVAL', 'ENOTSUP', 'EOPNOTSUPP']);

function syncPath(path, flags, fsync, directory) {
  let fd;
  try { fd = openSync(path, flags); } catch (e) {
    if (directory && DIR_FSYNC_UNSUPPORTED.has(String(e?.code))) return;
    throw new LessonStoreError('LibraryNotDurable',
      `The lesson could not be confirmed written to disk (${safeCode(e)}), so it was not saved.`);
  }
  try { fsync(fd, { directory }); } catch (e) {
    // Explicit, qualified tolerance — and ONLY for the directory barrier.
    if (directory && DIR_FSYNC_UNSUPPORTED.has(String(e?.code))) return;
    throw new LessonStoreError('LibraryNotDurable',
      `The lesson could not be confirmed written to disk (${safeCode(e)}), so it was not saved.`);
  } finally { try { closeSync(fd); } catch { /* ignore */ } }
}

/**
 * @param dir where records live. Created 0700 if missing. Must be OUTSIDE the static
 *            allowlist and outside the deployed tree: nothing here is web-reachable.
 * @param fsync injectable only so a test can prove a REAL fsync failure is not
 *              swallowed. There is no other way to make a disk fail on demand.
 */
export function openLessonStore({ dir, fsync = (fd) => fsyncSync(fd) }) {
  if (!dir) throw new LessonStoreError('LibraryUnconfigured', 'No lesson library directory is configured.');
  const quarantine = join(dir, 'quarantine');
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    // mkdir's mode is masked by umask, and an EXISTING directory keeps its old mode, so
    // set it explicitly rather than trusting the create.
    chmodSync(dir, 0o700);
  } catch (e) {
    // e.message carries the full path it tried; only the fixed errno token is safe.
    throw new LessonStoreError('LibraryUnwritable',
      `The lesson library directory could not be opened (${safeCode(e)}).`);
  }

  const file = (key) => join(dir, `${checkKey(key)}.json`);
  // Immutable per-generation copy, content-addressed. A FILE in the same directory, not a
  // subdirectory, so the 0700-dir/0600-file mode contract still holds with nothing extra;
  // and the `.rec` extension keeps it out of every `*.json` record enumeration, including
  // count() and the existing archive tests. A hardlink of the same 0600 temp file, so it
  // is written once and is byte-identical to the lookup record.
  const version = (key, digest) => join(dir, `${key}.${digest}.rec`);
  const VERSION_OF = (key) => new RegExp(`^${key}\\.[0-9a-f]{64}\\.rec$`);
  // Feedback lives in its OWN file, keyed by recordId (the version digest), never inside
  // the record: a vote must not change a lesson's digest or its cache key.
  const fbFile = (recordId) => join(dir, `${checkKey(recordId)}.fb`);

  const syncFile = (p) => syncPath(p, 'r', fsync, false);
  const syncDir = () => syncPath(dir, 'r', fsync, true);

  const fault = (e) => new LessonStoreError(
    // Out of space / over quota is a distinct, non-retryable-by-retrying condition and
    // the owner has to act on it, so it must not read as a generic failure.
    e.code === 'ENOSPC' || e.code === 'EDQUOT' ? 'LibraryFull' : 'LibraryUnwritable',
    e.code === 'ENOSPC' || e.code === 'EDQUOT'
      ? 'The lesson library is out of disk space, so this lesson could not be saved.'
      : `The lesson library could not be written (${safeCode(e)}).`);

  return {
    /**
     * Put-if-absent. A key that already exists is left EXACTLY as it was: an archived
     * version is immutable, so a re-run cannot rewrite history under a lesson the owner
     * already has on screen.
     *
     * `recordId` is ALWAYS the digest of the version THIS call archived, even when the
     * lookup slot was already taken by an earlier generation. Returning the old
     * record's digest was the bug: the caller then hung this generation's metadata and
     * this learner's thumbs on a different lesson version, and the version just written
     * was unreachable. `id` still names the LOOKUP record, because that is the entry a
     * later request for the same key resolves to.
     *
     * `saved` means "this call PUBLISHED THE LOOKUP RECORD", which is not the same
     * claim as "this version is on disk". A distinct second generation under a taken
     * key is archived (its own .rec file, reachable by the returned recordId) and still
     * reports saved:false, because the lookup slot is immutably the first writer's. Use
     * `recordId` for durability of THIS version; `saved` for who owns the slot.
     *
     * @returns {{saved:boolean, id:string, recordId:string}}
     */
    save(key, { lesson, request, provenance, metadata }) {
      checkKey(key);
      const id = key.slice(0, 16);
      const record = { v: STORE_VERSION, id, key, generated_at: new Date().toISOString(),
        lesson, request, provenance, ...(metadata === undefined ? {} : { metadata }) };
      record.digest = digestOf(record);
      const body = JSON.stringify(record);
      // Write the whole record to a private temp name first, then link it into place.
      // A reader therefore only ever sees a complete file, and link() fails EEXIST
      // instead of overwriting, which is the immutability guarantee and the race guard
      // in one syscall — no check-then-write window.
      const tmp = join(dir, `.tmp-${id}-${process.pid}-${Date.now()}`);
      try {
        writeFileSync(tmp, body, { mode: 0o600, flag: 'wx' });
        chmodSync(tmp, 0o600);
        syncFile(tmp);
        // EVERY distinct generation is kept, even when the lookup slot is already taken.
        // Content-addressed by the record's own digest, so an identical re-run collapses
        // onto the same name (no duplicate) while a genuinely different lesson produced
        // for the same request — a cross-process race where both workers really called
        // the model — survives instead of being thrown away.
        // EEXIST here means this EXACT content is already archived under the same
        // digest, which is idempotent, not a failure.
        try { linkSync(tmp, version(key, record.digest)); }
        catch (e) { if (e.code !== 'EEXIST') throw e; }
        // The lookup slot is first-writer-wins and immutable. Losing it does not make
        // this version unsaved: its own .rec file above is the archived record.
        let published = true;
        try { linkSync(tmp, file(key)); }
        catch (e) { if (e.code !== 'EEXIST') throw e; published = false; }
        syncDir();
        // `id` is the lookup record's short id — the existing one when the slot was
        // already taken, so lookups keep resolving where they always did.
        return { saved: published, id: this.get(key)?.record?.id ?? id, recordId: record.digest };
      } catch (e) {
        if (e instanceof LessonStoreError) throw e;
        throw fault(e);
      } finally { try { unlinkSync(tmp); } catch { /* already linked away or never made */ } }
    },

    /**
     * Record one explicit vote. `vote: null` removes this voter's vote.
     *
     * The token is hashed WITH the recordId, so the same browser token on two lessons
     * produces two unrelated hashes and the stored file cannot be used to follow one
     * person across lessons. The raw token never touches disk.
     *
     * ponytail: read-modify-write under a single-owner local server, so no lock. This is
     * duplicate prevention, NOT authenticated multi-user abuse resistance — a caller can
     * mint as many tokens as it likes. Add per-record locking if this ever serves more
     * than one person.
     */
    vote(recordId, { voterToken, vote }) {
      checkKey(recordId);
      if (typeof voterToken !== 'string' || !VOTER.test(voterToken)) {
        throw new LessonStoreError('VoterTokenInvalid', 'A voter token must be 32 lowercase hex characters.');
      }
      if (vote !== null && !VOTES.includes(vote)) {
        throw new LessonStoreError('VoteInvalid', `A vote must be one of ${VOTES.join(', ')}, or null.`);
      }
      const who = createHash('sha256').update(`${recordId}\u0000${voterToken}`).digest('hex');
      const path = fbFile(recordId);
      // Read-before-write. A file that exists but does not parse or does not validate
      // STOPS the vote: overwriting it would destroy real votes and the evidence of
      // whatever corrupted them, and silently restarting the count from zero is a
      // fabricated number presented as a learner's feedback.
      const votes = readVotes(path) ?? {};
      if (vote === null) delete votes[who]; else votes[who] = vote;
      // Same write-then-rename as the records: a reader never sees a half-written file.
      const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
      try {
        writeFileSync(tmp, JSON.stringify({ v: STORE_VERSION, votes }), { mode: 0o600 });
        chmodSync(tmp, 0o600);
        syncFile(tmp);
        renameSync(tmp, path);
        syncDir();
      } catch (e) {
        try { unlinkSync(tmp); } catch { /* never made */ }
        if (e instanceof LessonStoreError) throw e;
        throw fault(e);
      }
      return this.feedbackOf(recordId) ?? tally({});
    },

    /** @returns the tally, or null when no version with this recordId exists. */
    feedbackOf(recordId) {
      checkKey(recordId);
      if (!this.hasRecord(recordId)) return null;
      return tally(readVotes(fbFile(recordId)) ?? {});
    },

    /**
     * This caller's OWN standing vote on a version: `'up' | 'down' | null`.
     *
     * The direction was always on disk — `vote()` stores `votes[hash] = 'up'|'down'`
     * keyed by the same recordId+token hash — there was simply no way to read it back,
     * so a reloaded UI could restore the counts but not which thumb belonged to it.
     * This is that read, and it is the ONLY honest source of the direction: the token's
     * mere existence proves a vote happened, never which way it went.
     *
     * The raw token is hashed exactly as `vote()` hashes it and is never stored or
     * returned; `null` covers "never voted", "vote removed" and "unknown record"
     * alike, so the reply cannot be used to probe what the library holds. Corrupt or
     * unreadable feedback still THROWS (readVotes), because answering `null` there
     * would report a learner's lost vote as "you never voted".
     */
    voteOf(recordId, voterToken) {
      checkKey(recordId);
      if (typeof voterToken !== 'string' || !VOTER.test(voterToken)) {
        throw new LessonStoreError('VoterTokenInvalid', 'A voter token must be 32 lowercase hex characters.');
      }
      if (!this.hasRecord(recordId)) return null;
      const who = createHash('sha256').update(`${recordId}\u0000${voterToken}`).digest('hex');
      return (readVotes(fbFile(recordId)) ?? {})[who] ?? null;
    },

    /**
     * Is `recordId` a version digest this library actually holds?
     *
     * The CONTENT decides, not the filename: anyone able to drop a file into the
     * library could otherwise name it `<key>.<64hex>.rec` and have an unknown digest
     * accepted as a real version — which is exactly the pre-write existence check the
     * rating route relies on, so a vote file would be created for a lesson that does
     * not exist.
     */
    hasRecord(recordId) {
      return this.recordById(recordId) !== null;
    },

    /** The full stored record for a version digest, for owner-side inspection. */
    recordById(recordId) {
      checkKey(recordId);
      let names;
      try { names = readdirSync(dir).filter((f) => f.endsWith(`.${recordId}.rec`)); }
      catch (e) { if (e.code === 'ENOENT') return null; throw fault(e); }
      for (const f of names) {
        try {
          const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
          if (r && r.digest === recordId && r.digest === digestOf(r)) return r;
        } catch { /* skip a corrupt copy; the digest check is the authority */ }
      }
      return null;
    },

    /**
     * @returns {{record:object}|null} null = clean miss. A record that is unreadable,
     * unparseable or keyed for something else is NOT returned and NOT silently deleted:
     * it is moved aside so the caller can regenerate and a human can still inspect it.
     */
    get(key) {
      checkKey(key);
      let raw;
      try { raw = readFileSync(file(key), 'utf8'); }
      catch (e) {
        if (e.code === 'ENOENT') return null;
        throw fault(e);
      }
      let record;
      try { record = JSON.parse(raw); } catch { this.quarantine(key, 'unparseable'); return null; }
      // A record whose own key or version disagrees with what was asked for is not this
      // lesson. Serving it would hand the learner someone else's lesson.
      if (!record || record.v !== STORE_VERSION || record.key !== key
        || !record.lesson || typeof record.lesson !== 'object') {
        this.quarantine(key, 'mismatched'); return null;
      }
      // Integrity LAST, over the whole record: a valid-shaped file whose lesson, request
      // or provenance was edited after archiving has the right key and the right age and
      // would otherwise be served as authentic.
      if (typeof record.digest !== 'string' || record.digest !== digestOf(record)) {
        this.quarantine(key, 'tampered'); return null;
      }
      return { record };
    },

    /** Move a bad record out of the lookup path, keeping it on disk for inspection. */
    quarantine(key, why) {
      try {
        mkdirSync(quarantine, { recursive: true, mode: 0o700 });
        chmodSync(quarantine, 0o700);
        renameSync(file(key), join(quarantine, `${key}.${why}.${Date.now()}.json`));
      } catch { /* best effort: a failed quarantine must not mask the miss it caused */ }
    },

    /**
     * Every retained generation for a key, newest-name-last. Normally one; more than one
     * means two processes really did generate for the same request and BOTH were kept.
     */
    versions(key) {
      checkKey(key);
      const want = VERSION_OF(key);
      try {
        return readdirSync(dir).filter((f) => want.test(f))
          .map((f) => { try { return JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { return null; } })
          // A corrupted version copy is not returned either: same digest rule as get().
          .filter((r) => r && r.key === key && r.digest === digestOf(r));
      } catch (e) {
        if (e.code === 'ENOENT') return [];
        throw fault(e);
      }
    },

    /** Archived lessons, excluding quarantined ones and in-flight temp files. */
    count() {
      try { return readdirSync(dir).filter((f) => FULL.test(f)).length; }
      catch (e) { throw fault(e); }
    },

    dir,
    mode: () => statSync(dir).mode & 0o777,
    close() { /* nothing held open; present so callers can be symmetrical */ },
  };
}

/**
 * Counts only. Named self-reported helpfulness because that is all a thumb is: it is NOT
 * evidence of learning, mastery or teaching efficacy, and must never be relabelled as
 * such.
 */
/**
 * The votes map from a feedback file, or null when there is genuinely no file.
 *
 * ONLY ENOENT means "nobody voted". Every other outcome — unreadable, unparseable,
 * wrong store version, a votes map that is not an object of voter-hash -> up/down —
 * throws, because the alternative is reporting a fabricated zero as a learner's
 * feedback and then overwriting the real bytes on the next vote.
 *
 * ponytail: validates shape, not provenance. The hashes cannot be re-derived without
 * the raw tokens (by design), so a hand-edited file with well-formed hashes is
 * indistinguishable from a real one; the digest-covered record is the integrity
 * boundary, this is only the honesty boundary.
 */
function readVotes(path) {
  let raw;
  try { raw = readFileSync(path, 'utf8'); }
  catch (e) {
    if (e.code === 'ENOENT') return null;
    throw new LessonStoreError('LibraryFeedbackUnavailable',
      `The feedback for this lesson could not be read (${safeCode(e)}).`);
  }
  const invalid = () => new LessonStoreError('LibraryFeedbackInvalid',
    'The stored feedback for this lesson is not valid, so its counts cannot be reported.'
    + ' It has been left untouched for inspection.');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw invalid(); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw invalid();
  if (parsed.v !== STORE_VERSION) throw invalid();
  const votes = parsed.votes;
  if (!votes || typeof votes !== 'object' || Array.isArray(votes)) throw invalid();
  for (const [who, vote] of Object.entries(votes)) {
    if (!KEY.test(who) || !VOTES.includes(vote)) throw invalid();
  }
  return { ...votes };
}

function tally(votes) {
  const list = Object.values(votes);
  const thumbsUp = list.filter((v) => v === 'up').length;
  const thumbsDown = list.filter((v) => v === 'down').length;
  return { thumbsUp, thumbsDown, total: thumbsUp + thumbsDown,
    reportedHelpful: thumbsUp, semantics: FEEDBACK_SEMANTICS };
}
