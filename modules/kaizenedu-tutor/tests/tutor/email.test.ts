/**
 * The email wrapper (reference §5, ported from Kaizen-AI's `email.js`): an
 * honest answer in every state, suppression for promotional mail, the
 * one-click unsubscribe headers, escaping, and the reset template.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  emailConfigStatus,
  escapeHtml,
  parentInvitationEmail,
  passwordResetEmail,
  passwordResetUrl,
  RESEND_ENDPOINT,
  sendEmail,
  type SendEmailInput,
} from '@/lib/tutor/email';

const CONFIGURED = {
  RESEND_API_KEY: 're_test_123',
  EMAIL_FROM: 'Natural Tutor <hello@example.com>',
};

const MESSAGE: SendEmailInput = {
  to: 'parent@example.com',
  subject: 'A subject',
  html: '<p>Body</p>',
  text: 'Body',
  kind: 'essential',
};

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** A fetch that records the Resend call and answers with the given status. */
function transport(status = 200, reply: unknown = { id: 'em_1' }) {
  const calls: Captured[] = [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return new Response(JSON.stringify(reply), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch: fetchFn as unknown as typeof fetch, calls };
}

beforeAll(() => {
  vi.stubEnv('LOG_LEVEL', 'error');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('email configuration', () => {
  it('names both variables when nothing is set, and neither when both are', () => {
    expect(emailConfigStatus({})).toEqual({
      configured: false,
      missing: ['RESEND_API_KEY', 'EMAIL_FROM'],
    });
    expect(emailConfigStatus({ RESEND_API_KEY: ' ' }).missing).toEqual([
      'RESEND_API_KEY',
      'EMAIL_FROM',
    ]);
    expect(emailConfigStatus(CONFIGURED)).toEqual({ configured: true, missing: [] });
  });
});

describe('sendEmail', () => {
  it('reports not configured without calling anyone', async () => {
    const t = transport();
    const outcome = await sendEmail(MESSAGE, { fetch: t.fetch, env: {} });
    expect(outcome).toEqual({ sent: false, reason: 'not_configured' });
    expect(t.calls).toEqual([]);
  });

  it('posts the message to Resend with the configured sender and no opt-out headers', async () => {
    const t = transport();
    const outcome = await sendEmail(MESSAGE, { fetch: t.fetch, env: CONFIGURED });
    expect(outcome).toEqual({ sent: true, id: 'em_1' });
    expect(t.calls).toHaveLength(1);
    const [call] = t.calls;
    expect(call!.url).toBe(RESEND_ENDPOINT);
    expect(call!.headers.Authorization).toBe('Bearer re_test_123');
    expect(call!.body).toEqual({
      from: CONFIGURED.EMAIL_FROM,
      to: ['parent@example.com'],
      subject: 'A subject',
      html: '<p>Body</p>',
      text: 'Body',
    });
  });

  it('adds the one-click unsubscribe headers when the message carries an opt-out link', async () => {
    const t = transport();
    await sendEmail(
      { ...MESSAGE, kind: 'promotional', unsubscribeUrl: 'https://example.com/u?t=abc' },
      { fetch: t.fetch, env: CONFIGURED },
    );
    expect(t.calls[0]!.body.headers).toEqual({
      'List-Unsubscribe': '<https://example.com/u?t=abc>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });

  it('drops promotional mail to an opted-out recipient and still sends essential mail', async () => {
    const t = transport();
    const promo = await sendEmail(
      { ...MESSAGE, kind: 'promotional', optedOut: true },
      { fetch: t.fetch, env: CONFIGURED },
    );
    expect(promo).toEqual({ sent: false, reason: 'suppressed' });
    expect(t.calls).toEqual([]);
    const essential = await sendEmail(
      { ...MESSAGE, kind: 'essential', optedOut: true },
      { fetch: t.fetch, env: CONFIGURED },
    );
    expect(essential.sent).toBe(true);
    expect(t.calls).toHaveLength(1);
  });

  it('reports a refused or broken send instead of swallowing it', async () => {
    const refused = transport(500, { message: 'no' });
    expect(await sendEmail(MESSAGE, { fetch: refused.fetch, env: CONFIGURED })).toEqual({
      sent: false,
      reason: 'failed',
      status: 500,
    });
    const broken = async () => {
      throw new Error('socket hang up');
    };
    expect(
      await sendEmail(MESSAGE, { fetch: broken as unknown as typeof fetch, env: CONFIGURED }),
    ).toEqual({ sent: false, reason: 'failed' });
  });
});

describe('markup', () => {
  it('escapes everything a person could type into a body', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
    expect(escapeHtml(null)).toBe('');
  });

  it('tells a parent what their teen started, with the login name and no exclamation point', () => {
    const url = 'https://example.com/parent-invite?t=tok_abc';
    const mail = parentInvitationEmail({
      teenName: 'Maya <b>',
      loginName: 'maya.k',
      inviteUrl: url,
      existingAccount: false,
    });
    expect(mail.subject).toContain('Maya');
    expect(mail.html).toContain('Maya &lt;b&gt;');
    expect(mail.html).toContain('maya.k');
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.text).toContain(url);
    expect(mail.text).toContain('AI tutor');
    expect(`${mail.subject}${mail.text}`).not.toContain('!');
    const attach = parentInvitationEmail({
      teenName: 'Maya',
      loginName: 'maya.k',
      inviteUrl: url,
      existingAccount: true,
    });
    expect(attach.html).toContain('Add the profile to my account');
  });

  it('builds the reset message around one link, in both parts, with no exclamation point', () => {
    const url = passwordResetUrl('https://example.com', '/reset-password', 'tok_abc');
    expect(url).toBe('https://example.com/reset-password?t=tok_abc');
    const mail = passwordResetEmail({ resetUrl: url });
    expect(mail.subject).toContain('password');
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.text).toContain(url);
    expect(mail.html).toContain('AI tutor');
    expect(mail.text).toContain('AI tutor');
    expect(`${mail.subject}${mail.text}`).not.toContain('!');
  });
});
