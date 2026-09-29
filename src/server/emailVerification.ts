// Confirming an account's email address (0071). The link carries a signed
// token - no table: it names the user and the address it was sent to, so a
// link to an address the account has since changed away from does nothing.
// Clicking it again after it worked is harmless.

import { jwtVerify, SignJWT } from 'jose';
import { after, type NextRequest } from 'next/server';
import { siteUrl } from '@/lib/appConfig';
import config from './config';
import { type Email, sendEmail } from './email';
import { EMAIL_LOGO_PNG_BASE64 } from './emailLogo';
import { publicOrigin } from './http';
import type User from './model/user';
import { HttpError } from './util/httpError';
import log from './util/log';

const PURPOSE = 'verify-email';
const TOKEN_TTL = '3d';
// One resend per account per minute, per server process.
const RESEND_GAP_MS = 60 * 1000;

const secret = new TextEncoder().encode(config.secrets.session);
const lastSent = new Map<number, number>();

export function signVerifyToken(id: number, email: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, id, email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret);
}

// The user and address a link was for; 'expired' or 'invalid' otherwise.
// A session token is signed with the same secret, so the purpose is checked.
export async function readVerifyToken(token: string): Promise<{ id: number; email: string } | 'expired' | 'invalid'> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    const id = Number(payload.id);
    if (payload.purpose !== PURPOSE || !Number.isInteger(id) || typeof payload.email !== 'string') return 'invalid';
    return { id, email: payload.email };
  } catch (err) {
    return (err as { code?: string }).code === 'ERR_JWT_EXPIRED' ? 'expired' : 'invalid';
  }
}

// Production links always name the real site: the Host header is the
// client's to set, and a link built from it could hand the token elsewhere.
function linkOrigin(request: NextRequest): string {
  return process.env.NODE_ENV === 'production' ? siteUrl : publicOrigin(request);
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const LOGO_CID = 'chronopin-logo';
const FONT = "'IBM Plex Sans','Noto Sans',-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

// The site's own light and dark tokens (globals.css). Mail apps that honour
// prefers-color-scheme (Apple Mail, iOS, Outlook.com) get the dark set from
// the <style> block; the color-scheme meta tells them the email has its own
// dark look, so they do not invert it themselves - inverting is what turned
// the button's white text dark. Clients that drop <style> keep the light set.
const LIGHT = { page: '#f3f5f8', card: '#ffffff', line: '#dce0e6', field: '#f3f5f8', ink: '#15181d', muted: '#3d444e', subtle: '#5a616b', link: '#1d62c2', accent: '#2c6bc6' };
const DARK = { page: '#0f1115', card: '#181b21', line: '#272b33', field: '#0c0e12', ink: '#e7e9ec', muted: '#b4b9c0', subtle: '#8f959d', link: '#7cb3f2', accent: '#3374d0' };

const DARK_STYLE = `:root{color-scheme:light dark;supported-color-schemes:light dark}
@media (prefers-color-scheme:dark){
.cp-page{background:${DARK.page}!important}
.cp-card{background:${DARK.card}!important;border-color:${DARK.line}!important}
.cp-rule{border-color:${DARK.line}!important}
.cp-field{background:${DARK.field}!important;border-color:${DARK.line}!important}
.cp-ink{color:${DARK.ink}!important}
.cp-muted{color:${DARK.muted}!important}
.cp-subtle{color:${DARK.subtle}!important}
.cp-link{color:${DARK.link}!important}
.cp-button{background:${DARK.accent}!important}
}`;

// Tables and inline styles, since mail clients drop flexbox and some drop
// <style>. The logo travels inline (cid:) so it shows even in a message sent
// from a local server, and its size is set in CSS as well as the attributes:
// Apple Mail drew it at its full 96px from the attributes alone.
export function verificationEmail(
  user: { firstName?: string | null; userName?: string | null; email: string },
  { link, profileUrl, homeUrl }: { link: string; profileUrl: string; homeUrl: string },
): Email {
  const name = user.firstName || user.userName?.replace(/^@/, '') || '';
  const hello = name ? `Hello ${name},` : 'Hello,';
  const lead = 'Thanks for joining Chronopin. Confirm your email address to start posting pins and comments.';
  const text = [
    hello,
    '',
    lead,
    '',
    link,
    '',
    `This confirms ${user.email} for your Chronopin account.`,
    'The link works for 3 days. If you did not sign up for Chronopin, you can ignore this email.',
  ].join('\n');
  const e = escapeHtml;
  const c = LIGHT;
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Confirm your email</title>
<style>${DARK_STYLE}</style>
</head>
<body class="cp-page" style="margin:0;padding:0;background:${c.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(lead)}</div>
<table role="presentation" class="cp-page" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px"><tr>
<td style="padding-right:10px;vertical-align:middle"><img src="cid:${LOGO_CID}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0"></td>
<td class="cp-ink" style="vertical-align:middle;font-family:${FONT};font-size:24px;font-weight:700;letter-spacing:-0.3px;color:${c.ink}">Chronopin</td>
</tr></table>
<table role="presentation" class="cp-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${c.card};border:1px solid ${c.line};border-radius:16px">
<tr><td style="padding:40px 40px 8px;font-family:${FONT}">
<h1 class="cp-ink" style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.3px;color:${c.ink}">Confirm your email</h1>
<p class="cp-muted" style="margin:0 0 12px;font-size:16px;line-height:1.6;color:${c.muted}">${e(hello)}</p>
<p class="cp-muted" style="margin:0 0 32px;font-size:16px;line-height:1.6;color:${c.muted}">${e(lead)}</p>
</td></tr>
<tr><td align="center" style="padding:0 40px 32px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td class="cp-button" bgcolor="${c.accent}" style="border-radius:10px;background:${c.accent}">
<a href="${e(link)}" style="display:inline-block;padding:14px 36px;font-family:${FONT};font-size:16px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:10px">Confirm email address</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 40px 32px;font-family:${FONT}">
<p class="cp-subtle" style="margin:0;font-size:14px;line-height:1.6;color:${c.subtle};text-align:center">This confirms <a class="cp-link" href="${e(profileUrl)}" style="color:${c.link};text-decoration:none;font-weight:600">${e(user.email)}</a> for your Chronopin account.</p>
</td></tr>
<tr><td style="padding:0 40px"><div class="cp-rule" style="border-top:1px solid ${c.line};line-height:0;font-size:0">&nbsp;</div></td></tr>
<tr><td style="padding:24px 40px 36px;font-family:${FONT}">
<p class="cp-subtle" style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${c.subtle}">Button not working? Paste this link into your browser:</p>
<div class="cp-field" style="margin:0 0 20px;padding:10px 12px;background:${c.field};border:1px solid ${c.line};border-radius:8px;font-size:13px;line-height:1.5;word-break:break-all"><a class="cp-link" href="${e(link)}" style="color:${c.link};text-decoration:none">${e(link)}</a></div>
<p class="cp-subtle" style="margin:0;font-size:13px;line-height:1.5;color:${c.subtle}">The link works for 3 days. If you did not sign up for Chronopin, you can ignore this email.</p>
</td></tr>
</table>
<p class="cp-subtle" style="margin:24px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${c.subtle}"><a class="cp-subtle" href="${e(homeUrl)}" style="color:${c.subtle};text-decoration:none">Chronopin</a></p>
</td></tr>
</table>
</body></html>`;
  return {
    to: user.email,
    subject: 'Confirm your email for Chronopin',
    text,
    html,
    attachments: [{ filename: 'chronopin.png', contentBase64: EMAIL_LOGO_PNG_BASE64, contentId: LOGO_CID }],
  };
}

export async function sendVerificationEmail(user: User, request: NextRequest): Promise<void> {
  const token = await signVerifyToken(user.id, user.email);
  const origin = linkOrigin(request);
  const link = `${origin}/auth/verify-email?token=${encodeURIComponent(token)}`;
  lastSent.set(user.id, Date.now());
  await sendEmail(verificationEmail(user, { link, profileUrl: `${origin}/profile`, homeUrl: `${origin}/` }));
}

// For sign-up and an email change, after the response: the account is
// already saved, so a mail failure is logged rather than failing the request.
// The banner's resend button is the way back.
export function sendVerificationEmailInBackground(user: User, request: NextRequest): void {
  after(() => sendVerificationEmail(user, request).catch((err) => log.error(`verification email to user ${user.id} failed:`, (err as Error).message)));
}

// The resend button: a 429 inside the gap, so it cannot be used to flood an inbox.
export async function resendVerificationEmail(user: User, request: NextRequest): Promise<void> {
  const last = lastSent.get(user.id);
  if (last && Date.now() - last < RESEND_GAP_MS) {
    throw new HttpError(429, 'A confirmation email was just sent.', { code: 'emailVerifyTooSoon', message: 'A confirmation email was just sent. Try again in a minute.' });
  }
  await sendVerificationEmail(user, request);
}

// Posting needs a confirmed email; browsing, liking and following do not.
export function requireVerifiedEmail(user: User): void {
  if (!user.emailVerifiedDateTime) {
    throw new HttpError(403, 'Confirm your email address first.', { code: 'emailUnverified', message: 'Confirm your email address first.' });
  }
}
