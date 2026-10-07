// The Community Hall vote board — pure contract tests. One shared feed per
// Hall: a router compresses each free-text ask, matches it to an existing
// topic "party" or founds a new one, and the board ranks parties by distinct
// student voters so the tutor works the room democratically.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAsk, routerMessages, parseRouterReply, shapeBoard } from '@/lib/server/hallBoard.js';

test('validateAsk: trims, caps length, rejects empty and junk', () => {
  const ok = validateAsk({ text: '  how do i factor x^2 + 5x + 6 ?? ' });
  assert.equal(ok.ok, true);
  assert.equal(ok.text, 'how do i factor x^2 + 5x + 6 ??');
  assert.equal(validateAsk({ text: '' }).ok, false);
  assert.equal(validateAsk({ text: 'hi' }).ok, false); // < 4 chars is noise
  assert.equal(validateAsk({}).ok, false);
  assert.equal(validateAsk({ text: 'x'.repeat(500) }).ok, true); // capped, not rejected
  assert.ok(validateAsk({ text: 'x'.repeat(500) }).text.length <= 400);
});

test('routerMessages: carries the room topics and treats student text as data', () => {
  const msgs = routerMessages({
    topics: [{ id: 't1', title: 'Factoring quadratics' }],
    subject: 'Math',
    text: 'i dont get how to factor when a is not 1',
  });
  const user = msgs.find((m) => m.role === 'user');
  assert.ok(user.content.includes('Factoring quadratics'));
  assert.ok(user.content.includes('a is not 1'));
  // Untrusted-input framing: the student text is fenced as data.
  assert.ok(user.content.includes('<student_message>'));
});

test('parseRouterReply: accepts match, new-party, and rejects malformed replies', () => {
  const match = parseRouterReply('{"match":"t1","ask":"Factoring when a > 1"}', ['t1']);
  assert.deepEqual(match, { topicId: 't1', newTitle: null, ask: 'Factoring when a > 1' });

  const fresh = parseRouterReply('{"match":null,"title":"Unit circle basics","ask":"What is the unit circle for?"}', ['t1']);
  assert.equal(fresh.topicId, null);
  assert.equal(fresh.newTitle, 'Unit circle basics');

  // Unknown topic id from the model falls back to a new party, never a crash.
  const unknown = parseRouterReply('{"match":"t9","ask":"???","title":"Something"}', ['t1']);
  assert.equal(unknown.topicId, null);
  assert.ok(unknown.newTitle);

  assert.equal(parseRouterReply('not json at all', ['t1']), null);
  assert.equal(parseRouterReply('{"match":null}', ['t1']), null); // no ask text
});

test('shapeBoard: distinct students vote once per party, hottest first, asks listed', () => {
  const topics = [
    { id: 'a', title: 'Quadratics', status: 'open', created_at: '2026-08-12T01:00:00Z' },
    { id: 'b', title: 'Essay thesis', status: 'open', created_at: '2026-08-12T01:05:00Z' },
    { id: 'c', title: 'Covered thing', status: 'covered', created_at: '2026-08-12T00:00:00Z' },
  ];
  const asks = [
    { topic_id: 'a', student_id: 's1', text: 'factoring', created_at: '2026-08-12T01:01:00Z' },
    { topic_id: 'a', student_id: 's1', text: 'more factoring', created_at: '2026-08-12T01:02:00Z' },
    { topic_id: 'a', student_id: 's2', text: 'vertex form', created_at: '2026-08-12T01:03:00Z' },
    { topic_id: 'b', student_id: 's3', text: 'thesis help', created_at: '2026-08-12T01:06:00Z' },
    { topic_id: 'c', student_id: 's1', text: 'done already', created_at: '2026-08-12T00:01:00Z' },
  ];
  const board = shapeBoard(topics, asks, { totalStudents: 19 });
  assert.equal(board.totalStudents, 19);
  // Open parties first, ranked by voters; covered parties sink to the end.
  assert.deepEqual(board.parties.map((p) => p.id), ['a', 'b', 'c']);
  assert.equal(board.parties[0].voters, 2); // s1 counted once despite two asks
  assert.equal(board.parties[0].asks.length, 3); // every accumulated ask stays listed
  assert.equal(board.parties[1].voters, 1);
  assert.equal(board.parties[2].status, 'covered');
});
