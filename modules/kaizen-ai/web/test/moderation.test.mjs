// screenText — the deterministic inbound-safety pre-filter.
//
// Two failure modes, both tested: a MISS (a real disclosure the safety team never
// sees) and a FLOOD (innocent schoolwork tripping the queue until nobody reads
// it). For self-harm and abuse we accept some false positives to avoid misses;
// everywhere else we guard against the flood.

import test from 'node:test';
import assert from 'node:assert/strict';
import { screenText } from '@/lib/server/moderation.js';

const flags = (t) => screenText(t).flagged;
const cats = (t) => screenText(t).categories;

test('catches explicit self-harm disclosure (must never miss)', () => {
  for (const t of [
    'i want to kill myself',
    "I don't want to be alive anymore",
    'sometimes I think about suicide',
    'I have been cutting myself',
    'there is no reason to live',
    'i wanna end it all',
  ]) {
    assert.equal(flags(t), true, `missed: "${t}"`);
    assert.ok(screenText(t).categories.includes('self_harm'));
    assert.equal(screenText(t).severity, 'critical');
  }
});

test('catches abuse disclosure', () => {
  for (const t of [
    'my dad hits me',
    'my uncle touches me there',
    "I'm afraid to go home",
    'my stepdad beats me',
  ]) {
    assert.equal(flags(t), true, `missed: "${t}"`);
    assert.ok(cats(t).includes('abuse'));
  }
});

test('catches off-platform / grooming signals', () => {
  for (const t of [
    'text me on snapchat',
    "what's your phone number",
    "let's meet up after school",
    "don't tell your parents about this",
    'send me a selfie',
  ]) {
    assert.equal(flags(t), true, `missed: "${t}"`);
  }
});

test('catches threats of violence to others', () => {
  assert.equal(flags('I want to shoot up the school'), true);
  assert.ok(cats('I want to hurt everyone in my class').includes('violence_weapons'));
});

test('does NOT flag ordinary schoolwork (no flood)', () => {
  for (const t of [
    'How do I kill this bug in my code?',
    'The French Revolution killed many people — was it justified?',
    'I need to cut this fraction down to lowest terms',
    'My essay is about gun control laws in the US',
    'Can you help me end this paragraph better?',
    'The mitochondria is the powerhouse of the cell',
    'I want to die of embarrassment, that quiz was so hard',
    'Photosynthesis converts light into chemical energy',
    'meet me at the answer to question 3',
  ]) {
    assert.equal(flags(t), false, `false positive: "${t}"`);
  }
});

test('empty and whitespace input is never flagged', () => {
  assert.equal(flags(''), false);
  assert.equal(flags('   '), false);
  assert.equal(flags(null), false);
  assert.equal(flags(undefined), false);
});

test('severity ranks critical above high when both match', () => {
  // self-harm (critical) + off-platform (high) in one message → critical wins
  const r = screenText("i want to kill myself, text me on snapchat");
  assert.equal(r.severity, 'critical');
  assert.ok(r.categories.includes('self_harm'));
  assert.ok(r.categories.includes('grooming_offplatform'));
});
