// SSRF guard — the address blocklist and URL validation.
//
// This is the gate every future connector fetch goes through, so the blocklist
// is tested exhaustively against the ranges that actually matter: cloud instance
// metadata (169.254.169.254 — the one that leaks credentials), loopback, the
// RFC1918 private ranges, CGNAT, and the IPv6 equivalents including the
// IPv4-mapped form that is easy to forget.
//
// Only the pure parts are unit-tested. safeFetch() itself performs real network
// I/O and is exercised against a live URL in an integration check, not here —
// a test that quietly mocks the network would prove nothing about SSRF.

import test from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedAddress, assertSafeUrl } from '@/lib/server/safeFetch.js';

test('blocks cloud instance metadata (the credential-leak address)', () => {
  assert.equal(isBlockedAddress('169.254.169.254'), true);
  assert.equal(isBlockedAddress('169.254.0.1'), true);
});

test('blocks loopback and private ranges', () => {
  for (const ip of [
    '127.0.0.1', '127.1.2.3',
    '10.0.0.1', '10.255.255.255',
    '192.168.0.1', '192.168.1.100',
    '172.16.0.1', '172.20.10.5', '172.31.255.255',
    '100.64.0.1',        // CGNAT
    '0.0.0.0',
    '224.0.0.1',         // multicast
  ]) {
    assert.equal(isBlockedAddress(ip), true, `should block ${ip}`);
  }
});

test('allows ordinary public addresses', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.0.1', '172.32.0.1', '11.0.0.1']) {
    assert.equal(isBlockedAddress(ip), false, `should allow ${ip}`);
  }
});

test('172.16/12 boundary is exact — 172.15 and 172.32 are public', () => {
  assert.equal(isBlockedAddress('172.15.255.255'), false);
  assert.equal(isBlockedAddress('172.16.0.0'), true);
  assert.equal(isBlockedAddress('172.31.255.255'), true);
  assert.equal(isBlockedAddress('172.32.0.0'), false);
});

test('blocks IPv6 loopback, link-local, unique-local and multicast', () => {
  for (const ip of ['::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1']) {
    assert.equal(isBlockedAddress(ip), true, `should block ${ip}`);
  }
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false, 'public IPv6 allowed');
});

test('IPv4-mapped IPv6 is judged on the embedded v4 address', () => {
  // ::ffff:127.0.0.1 is loopback wearing a v6 hat — a classic bypass.
  assert.equal(isBlockedAddress('::ffff:127.0.0.1'), true);
  assert.equal(isBlockedAddress('::ffff:169.254.169.254'), true);
  assert.equal(isBlockedAddress('::ffff:8.8.8.8'), false);
});

test('non-IP input is treated as unsafe', () => {
  assert.equal(isBlockedAddress(''), true);
  assert.equal(isBlockedAddress(null), true);
  assert.equal(isBlockedAddress('example.com'), true, 'a name must be resolved first, never assumed safe');
});

test('rejects non-http schemes', async () => {
  for (const u of ['file:///etc/passwd', 'gopher://x', 'ftp://example.com', 'data:text/plain,hi']) {
    const r = await assertSafeUrl(u);
    assert.equal(r.ok, false, `should reject ${u}`);
    assert.match(r.reason, /scheme|valid URL/);
  }
});

test('rejects credentials embedded in the URL', async () => {
  const r = await assertSafeUrl('http://user:pass@example.com/feed.ics');
  assert.equal(r.ok, false);
  assert.match(r.reason, /credentials/);
});

test('rejects a literal internal address without any DNS', async () => {
  for (const u of ['http://127.0.0.1:54321/rest/v1/', 'http://169.254.169.254/latest/meta-data/']) {
    const r = await assertSafeUrl(u);
    assert.equal(r.ok, false, `should reject ${u}`);
    assert.match(r.reason, /blocked range/);
  }
});

test('rejects malformed input', async () => {
  for (const u of ['', 'not a url', null, undefined]) {
    const r = await assertSafeUrl(u);
    assert.equal(r.ok, false);
  }
});
