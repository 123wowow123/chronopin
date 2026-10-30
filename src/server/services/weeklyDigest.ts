import { jwtVerify, SignJWT } from 'jose';
import { siteUrl } from '@/lib/appConfig';
import { pinPath } from '@/lib/seo';
import { DIGEST_DAYS_AHEAD, dueDigestWeek } from '@/lib/weeklyDigest';
import config from '../config';
import { type Email, sendEmail } from '../email';
import { EMAIL_LOGO_PNG_BASE64 } from '../emailLogo';
import { DARK_STYLE, escapeHtml, FONT, LIGHT, LOGO_CID } from '../emailVerification';
import { getWeeklyDigest } from '../model/appSetting';
import Digest, { type DigestPin, type DigestReason, type DigestRecipient } from '../model/digest';
import log from '../util/log';

// The weekly "my timeline" email: every Monday, the pins starting in the next
// seven days that a subscriber watches or that come from a company or person
// they follow (Digest.upcoming). A timer in the server, like the watched-pin
// alerts: each tick checks the admin switch and whether the Monday slot is
// open, and the unique DigestSend row per user and week is what keeps it to
// one email however many servers see it due.

const CHECK_MS = 5 * 60 * 1000;
const BATCH = 40;
// Resend allows two requests a second.
const GAP_MS = 600;

const g = globalThis as unknown as { __chronopinDigestTimer?: ReturnType<typeof setInterval>; __chronopinDigestBusy?: boolean };

const secret = new TextEncoder().encode(config.secrets.session);
const PURPOSE = 'digest-unsubscribe';

// The unsubscribe link carries the user id signed with the session secret and
// no expiry: a link in an old email must still work.
export function signUnsubscribeToken(userId: number): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, id: userId }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().sign(secret);
}

export async function readUnsubscribeToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    const id = Number(payload.id);
    return payload.purpose === PURPOSE && Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function digestOrigin(): string {
  return process.env.NODE_ENV === 'production' ? siteUrl : 'http://localhost:3000';
}

const WHEN_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const WHEN_TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC', hour12: false });

export function whenText(pin: Pick<DigestPin, 'start' | 'allDay'>): string {
  const at = new Date(pin.start);
  return pin.allDay ? WHEN_DAY.format(at) : `${WHEN_DAY.format(at)}, ${WHEN_TIME.format(at)} UTC`;
}

const PARTS: { reason: DigestReason; heading: string; note: (label: string | null) => string }[] = [
  { reason: 'watched', heading: 'Pins you watch', note: () => '' },
  { reason: 'company', heading: 'From companies you follow', note: (l) => l ?? '' },
  { reason: 'followed', heading: 'From people you follow', note: (l) => (l ? `by ${l.replace(/^@?/, '@')}` : '') },
];

type DigestEmailOptions = {
  // The DigestSend row, so links and the opening pixel are counted. Null for a test.
  sendId: number | null;
  origin: string;
  unsubscribeUrl: string;
};

export function digestEmail(user: Pick<DigestRecipient, 'email' | 'firstName' | 'userName'>, pins: DigestPin[], { sendId, origin, unsubscribeUrl }: DigestEmailOptions): Email {
  const name = user.firstName || user.userName?.replace(/^@/, '') || '';
  const hello = name ? `Hello ${name},` : 'Hello,';
  const lead = `Here is what is coming up in the next ${DIGEST_DAYS_AHEAD} days on the timeline you follow.`;
  const link = (path: string) => (sendId ? `${origin}/api/digest/${sendId}/click?to=${encodeURIComponent(path)}` : `${origin}${path}`);
  const manage = `${origin}/profile/notifications`;
  const e = escapeHtml;
  const c = LIGHT;

  const textParts: string[] = [];
  const htmlParts: string[] = [];
  for (const part of PARTS) {
    const inPart = pins.filter((p) => p.reason === part.reason);
    if (!inPart.length) continue;
    textParts.push(part.heading.toUpperCase(), ...inPart.map((p) => `- ${whenText(p)}  ${p.title}${part.note(p.label) ? ` (${part.note(p.label)})` : ''}\n  ${link(pinPath(p))}`), '');
    htmlParts.push(
      `<tr><td style="padding:24px 40px 4px;font-family:${FONT}"><h2 class="cp-ink" style="margin:0;font-size:17px;line-height:1.3;font-weight:700;color:${c.ink}">${e(part.heading)}</h2></td></tr>`,
      ...inPart.map((p) => {
        const note = part.note(p.label);
        return `<tr><td style="padding:10px 40px 0;font-family:${FONT}">
<div class="cp-subtle" style="font-size:13px;line-height:1.4;color:${c.subtle}">${e(whenText(p))}${note ? ` · ${e(note)}` : ''}</div>
<a class="cp-link" href="${e(link(pinPath(p)))}" style="font-size:16px;line-height:1.4;font-weight:600;color:${c.link};text-decoration:none">${e(p.title)}</a>
</td></tr>`;
      }),
    );
  }

  const text = [hello, '', lead, '', ...textParts, `Change what you follow or stop this email: ${manage}`, `Unsubscribe: ${unsubscribeUrl}`].join('\n');
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your week on Chronopin</title>
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
<h1 class="cp-ink" style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.3px;color:${c.ink}">Your week ahead</h1>
<p class="cp-muted" style="margin:0 0 12px;font-size:16px;line-height:1.6;color:${c.muted}">${e(hello)}</p>
<p class="cp-muted" style="margin:0;font-size:16px;line-height:1.6;color:${c.muted}">${e(lead)}</p>
</td></tr>
${htmlParts.join('\n')}
<tr><td style="padding:32px 40px 0"><div class="cp-rule" style="border-top:1px solid ${c.line};line-height:0;font-size:0">&nbsp;</div></td></tr>
<tr><td style="padding:20px 40px 36px;font-family:${FONT}">
<p class="cp-subtle" style="margin:0;font-size:13px;line-height:1.6;color:${c.subtle}">You get this because you turned on the weekly email. <a class="cp-link" href="${e(manage)}" style="color:${c.link};text-decoration:none">Change what you follow</a> or <a class="cp-link" href="${e(unsubscribeUrl)}" style="color:${c.link};text-decoration:none">unsubscribe</a>. Times are UTC.</p>
</td></tr>
</table>
<p class="cp-subtle" style="margin:24px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${c.subtle}"><a class="cp-subtle" href="${e(origin)}/" style="color:${c.subtle};text-decoration:none">Chronopin</a></p>
${sendId ? `<img src="${e(origin)}/api/digest/${sendId}/open" width="1" height="1" alt="" style="display:block;border:0">` : ''}
</td></tr>
</table>
</body></html>`;
  return {
    to: user.email,
    subject: pins.length === 1 ? `Coming up: ${pins[0].title}` : `Your week ahead: ${pins.length} pins coming up`,
    text,
    html,
    attachments: [{ filename: 'chronopin.png', contentBase64: EMAIL_LOGO_PNG_BASE64, contentId: LOGO_CID }],
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

function countByReason(pins: DigestPin[]): Record<DigestReason, number> {
  return { watched: pins.filter((p) => p.reason === 'watched').length, company: pins.filter((p) => p.reason === 'company').length, followed: pins.filter((p) => p.reason === 'followed').length };
}

async function unsubscribeUrlFor(userId: number): Promise<string> {
  return `${digestOrigin()}/auth/digest-unsubscribe?token=${encodeURIComponent(await signUnsubscribeToken(userId))}`;
}

// Builds and sends one user's email for the week. Returns whether one went out.
async function sendOne(user: DigestRecipient, week: string, now: Date): Promise<boolean> {
  const sendId = await Digest.claim(user.id, week);
  if (!sendId) return false;
  try {
    const pins = await Digest.upcoming(user.id, now);
    if (!pins.length) {
      await Digest.finish(sendId, { status: 'skipped' });
      return false;
    }
    await sendEmail(digestEmail(user, pins, { sendId, origin: digestOrigin(), unsubscribeUrl: await unsubscribeUrlFor(user.id) }));
    await Digest.finish(sendId, { status: 'sent', counts: countByReason(pins), pinCount: pins.length });
    return true;
  } catch (err) {
    log.warn(`[digest] user ${user.id}:`, (err as Error).message);
    await Digest.finish(sendId, { status: 'failed', error: (err as Error).message });
    return false;
  }
}

// One tick. Returns how many emails were sent.
export async function checkWeeklyDigest(now = new Date()): Promise<number> {
  if (g.__chronopinDigestBusy) return 0;
  const week = dueDigestWeek(now);
  if (!week || !(await getWeeklyDigest()).enabled) return 0;
  g.__chronopinDigestBusy = true;
  try {
    await Digest.failStale();
    let sent = 0;
    for (;;) {
      const batch = await Digest.dueRecipients(week, BATCH);
      if (!batch.length) break;
      for (const user of batch) {
        if (await sendOne(user, week, now)) {
          sent++;
          await new Promise((resolve) => setTimeout(resolve, GAP_MS));
        }
      }
    }
    if (sent) log.info(`[digest] sent ${sent} for the week of ${week}`);
    return sent;
  } finally {
    g.__chronopinDigestBusy = false;
  }
}

// The admin's "send me one now": the signed-in admin's own digest, to their own
// address, ignoring the schedule and the switch. Not counted anywhere.
export async function sendTestDigest(user: DigestRecipient, now = new Date()): Promise<{ pins: number }> {
  const pins = await Digest.upcoming(user.id, now);
  if (!pins.length) return { pins: 0 };
  await sendEmail(digestEmail(user, pins, { sendId: null, origin: digestOrigin(), unsubscribeUrl: await unsubscribeUrlFor(user.id) }));
  return { pins: pins.length };
}

export function startWeeklyDigest() {
  if (g.__chronopinDigestTimer) return;
  const tick = () => void checkWeeklyDigest().catch((err) => log.warn('weekly digest check failed:', (err as Error).message));
  g.__chronopinDigestTimer = setInterval(tick, CHECK_MS);
  g.__chronopinDigestTimer.unref();
}
