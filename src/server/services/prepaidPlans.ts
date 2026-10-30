import { siteUrl } from '@/lib/appConfig';
import { type Email, sendEmail } from '../email';
import { EMAIL_LOGO_PNG_BASE64 } from '../emailLogo';
import { DARK_STYLE, escapeHtml, FONT, LIGHT, LOGO_CID } from '../emailVerification';
import PrepaidPlan, { type DueReminder, type PrepaidKind, PREPAID_DAYS, REMINDER_DAYS } from '../model/prepaidPlan';
import { CHECKOUT_PRICES, stripeRequest } from '../stripe';
import log from '../util/log';

// One month of a plan paid once with WeChat Pay (0235). Stripe cannot put WeChat
// Pay on a subscription, so this is a one-off payment in yuan at the plan's
// monthly price: no renewal, and an email REMINDER_DAYS before the month ends.
// The webhook (checkout.session.async_payment_succeeded / completed) adds the
// month; a timer sends the reminders.

const PLANS: Record<PrepaidKind, { price: keyof (typeof CHECKOUT_PRICES)['cny'] | null; name: string; description: string; label: string; page: string }> = {
  adfree: { price: 'adFree', name: 'Chronopin ad-free (1 month)', description: 'No ads on Chronopin for 30 days. Does not renew.', label: 'ad-free plan', page: '/profile' },
  premium: { price: 'premium', name: 'Chronopin Premium (1 month)', description: 'Trader positions, estimated PnL and live trade alerts for 30 days. Does not renew.', label: 'Premium plan', page: '/premium' },
  heavy: { price: null, name: 'Chronopin heavy user (30 days)', description: 'No ads and unlimited reading for 30 days. Does not renew.', label: 'heavy user plan', page: '/heavy-use' },
  bundle: { price: 'bundle', name: 'Chronopin ad-free + Premium (1 month)', description: 'No ads, plus trader positions and alerts, for 30 days. Does not renew.', label: 'ad-free + Premium bundle', page: '/premium' },
};

export function isPrepaidKind(value: unknown): value is PrepaidKind {
  return value === 'adfree' || value === 'premium' || value === 'bundle';
}

// A Stripe Checkout page that takes WeChat Pay only (it is the one method that
// cannot subscribe; cards already have the subscription buttons).
export async function startWechatCheckout(user: { id: number; email?: string | null }, plan: Exclude<PrepaidKind, 'heavy'>, origin: string, successPath: string): Promise<string> {
  const info = PLANS[plan];
  const metadata = { prepaidUserId: String(user.id), prepaidPlan: plan };
  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    mode: 'payment',
    client_reference_id: String(user.id),
    ...(user.email ? { customer_email: user.email } : {}),
    payment_method_types: ['wechat_pay'],
    payment_method_options: { wechat_pay: { client: 'web' } },
    line_items: [
      {
        quantity: 1,
        price_data: { currency: 'cny', unit_amount: CHECKOUT_PRICES.cny[info.price!], product_data: { name: info.name, description: info.description } },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${origin}${successPath}`,
    cancel_url: `${origin}${info.page}`,
  });
  return session.url;
}

// The webhook's side: a paid session adds a month. Safe to see twice.
export async function confirmPrepaidPayment(object: Record<string, unknown>): Promise<void> {
  const metadata = object.metadata as Record<string, string> | null | undefined;
  const userId = Number(metadata?.prepaidUserId);
  const plan = metadata?.prepaidPlan;
  if (!Number.isInteger(userId) || userId <= 0 || !isPrepaidKind(plan)) return;
  if (await PrepaidPlan.add(userId, plan, String(object.id))) log.info(`[prepaid] user ${userId} paid a month of ${plan}`);
}

const DAY = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const DAY_ZH = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

// English and Chinese in one message: WeChat Pay buyers are mostly in China, and
// the account's language is not known here.
export function reminderEmail(reminder: Pick<DueReminder, 'plan' | 'end' | 'email' | 'firstName' | 'userName'>, origin = siteUrl): Email {
  const info = PLANS[reminder.plan];
  const name = reminder.firstName || reminder.userName?.replace(/^@/, '') || '';
  const date = `${DAY.format(reminder.end)} UTC`;
  const dateZh = `${DAY_ZH.format(reminder.end)}（UTC）`;
  const renew = `${origin}${info.page}`;
  const zhPlan = { adfree: '免广告', premium: '高级版', bundle: '免广告 + 高级版套餐', heavy: '重度用户' }[reminder.plan];
  const lines = [
    name ? `Hello ${name},` : 'Hello,',
    `Your month of the Chronopin ${info.label} ends on ${date}, in ${REMINDER_DAYS} days or less. It does not renew by itself.`,
    `To keep it, buy another month before then and it will continue from the end date: ${renew}`,
    '',
    name ? `${name}，您好：` : '您好：',
    `您购买的 Chronopin ${zhPlan}一个月将于 ${dateZh} 到期（${REMINDER_DAYS} 天内）。该服务不会自动续订。`,
    `如需继续使用，请在到期前再购买一个月，将从到期日顺延：${renew}`,
  ];
  const e = escapeHtml;
  const c = LIGHT;
  const p = (text: string, last = false) =>
    `<p class="cp-muted" style="margin:0 0 ${last ? 0 : 12}px;font-size:16px;line-height:1.6;color:${c.muted}">${e(text)}</p>`;
  const button = `<a href="${e(renew)}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:${c.link};color:#ffffff;font-weight:600;text-decoration:none;font-size:16px">Buy another month · 再购买一个月</a>`;
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your Chronopin month ends soon</title>
<style>${DARK_STYLE}</style>
</head>
<body class="cp-page" style="margin:0;padding:0;background:${c.page}">
<table role="presentation" class="cp-page" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px"><tr>
<td style="padding-right:10px;vertical-align:middle"><img src="cid:${LOGO_CID}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0"></td>
<td class="cp-ink" style="vertical-align:middle;font-family:${FONT};font-size:24px;font-weight:700;letter-spacing:-0.3px;color:${c.ink}">Chronopin</td>
</tr></table>
<table role="presentation" class="cp-card" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${c.card};border:1px solid ${c.line};border-radius:16px">
<tr><td style="padding:40px;font-family:${FONT}">
<h1 class="cp-ink" style="margin:0 0 20px;font-size:24px;line-height:1.25;font-weight:700;color:${c.ink}">Your month ends on ${e(DAY.format(reminder.end))}<br>您的一个月将于 ${e(DAY_ZH.format(reminder.end))}到期</h1>
${lines.map((l) => (l ? p(l) : '<div style="height:12px"></div>')).join('\n')}
<div style="margin-top:24px">${button}</div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  return {
    to: reminder.email ?? '',
    subject: `Your Chronopin ${info.label} ends on ${DAY.format(reminder.end)} · 您的 Chronopin ${zhPlan}即将到期`,
    text: lines.join('\n'),
    html,
    attachments: [{ filename: 'chronopin.png', contentBase64: EMAIL_LOGO_PNG_BASE64, contentId: LOGO_CID }],
  };
}

const CHECK_MS = 10 * 60 * 1000;
const BATCH = 40;
// Resend allows two requests a second.
const GAP_MS = 600;
const g = globalThis as unknown as { __chronopinPrepaidTimer?: ReturnType<typeof setInterval>; __chronopinPrepaidBusy?: boolean };

// One tick: remind everyone whose month ends within REMINDER_DAYS. The claim on
// the row keeps it to one email however many servers see it due; a send that
// fails gives the claim back so the next tick tries again.
export async function sendPrepaidReminders(): Promise<number> {
  if (g.__chronopinPrepaidBusy) return 0;
  g.__chronopinPrepaidBusy = true;
  let sent = 0;
  try {
    for (const reminder of await PrepaidPlan.dueReminders(BATCH)) {
      if (!reminder.email) {
        await PrepaidPlan.claimReminder(reminder.id);
        continue;
      }
      if (!(await PrepaidPlan.claimReminder(reminder.id))) continue;
      try {
        await sendEmail(reminderEmail(reminder));
        sent++;
        await new Promise((resolve) => setTimeout(resolve, GAP_MS));
      } catch (err) {
        log.warn(`[prepaid] reminder for user ${reminder.userId}:`, (err as Error).message);
        await PrepaidPlan.releaseReminder(reminder.id);
      }
    }
    if (sent) log.info(`[prepaid] sent ${sent} month-ending reminders`);
    return sent;
  } finally {
    g.__chronopinPrepaidBusy = false;
  }
}

export function startPrepaidReminders() {
  if (g.__chronopinPrepaidTimer) return;
  g.__chronopinPrepaidTimer = setInterval(() => void sendPrepaidReminders().catch((err) => log.warn('prepaid reminder check failed:', (err as Error).message)), CHECK_MS);
  g.__chronopinPrepaidTimer.unref();
}

export { PREPAID_DAYS };
