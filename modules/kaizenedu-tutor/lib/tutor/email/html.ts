/**
 * Email markup. A mail client renders none of the product's stylesheet, so
 * every style is inline and the palette is written out as hex. Every value
 * that came from a person passes through `escapeHtml` before it lands in a
 * body: an account named `<a href=…>` must never inject live markup through
 * our trusted sender.
 */
import { PRODUCT } from '@/kaizen.config';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The product's light tokens as hex (components/tutor/brand/tokens.css):
 * background, foreground, muted-foreground, border, and `--primary`, the one
 * brand hue, oklch(0.46 0.085 195).
 */
export const EMAIL_PALETTE = {
  paper: '#ffffff',
  ink: '#262626',
  muted: '#737373',
  border: '#e5e5e5',
  accent: '#0a6766',
} as const;

const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface EmailDocument {
  subject: string;
  html: string;
  text: string;
}

export interface EmailLayoutInput {
  /** Rendered as the heading; already plain text, escaped here. */
  title: string;
  /** Trusted markup built by a template; user-supplied values inside it are escaped by the template. */
  bodyHtml: string;
  /** Present on promotional mail to a known account: the one-click opt-out. */
  unsubscribeUrl?: string | null;
}

/** The one-time link every token email carries: the page, with the token as `?t=`. */
export function tokenLink(baseUrl: string, path: string, token: string): string {
  return `${baseUrl}${path}?t=${encodeURIComponent(token)}`;
}

/** A button-shaped link. Inline styles only; the href is escaped here. */
export function emailButton(href: string, label: string): string {
  return (
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;` +
    `border-radius:8px;background:${EMAIL_PALETTE.accent};color:#ffffff;font-weight:600;` +
    `text-decoration:none">${escapeHtml(label)}</a>`
  );
}

export function emailParagraph(text: string, tone: 'body' | 'muted' = 'body'): string {
  const color = tone === 'muted' ? EMAIL_PALETTE.muted : EMAIL_PALETTE.ink;
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${color}">${escapeHtml(text)}</p>`;
}

/**
 * The frame every message shares: heading, body, and the footer that names
 * the product as an AI tutor and links the privacy page — plus the opt-out
 * when the mail is one the recipient may switch off.
 */
export function emailLayout(input: EmailLayoutInput): string {
  const unsubscribe = input.unsubscribeUrl
    ? ` · <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${EMAIL_PALETTE.muted}">Unsubscribe from non-essential email</a>`
    : '';
  return (
    `<div style="font-family:${FONT};max-width:520px;margin:0 auto;padding:24px 16px;` +
    `background:${EMAIL_PALETTE.paper};color:${EMAIL_PALETTE.ink}">` +
    `<h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;font-weight:600">${escapeHtml(input.title)}</h1>` +
    input.bodyHtml +
    `<p style="margin:28px 0 0;padding-top:12px;border-top:1px solid ${EMAIL_PALETTE.border};` +
    `font-size:12px;line-height:1.6;color:${EMAIL_PALETTE.muted}">` +
    `${escapeHtml(PRODUCT.workingName)}, an ${escapeHtml(PRODUCT.aiLabel)}. Sent because this address has an account.` +
    `${unsubscribe}</p></div>`
  );
}
