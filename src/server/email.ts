// Account email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// No SDK: one POST. Without RESEND_API_KEY - locally, and in tests - nothing
// leaves the machine and the message goes to the server log instead, so a
// sign-up can still be finished by copying the link from there.

import config from './config';
import log from './util/log';

// An inline attachment is shown where the HTML says <img src="cid:{contentId}">.
export type EmailAttachment = { filename: string; contentBase64: string; contentId: string };
export type Email = { to: string; subject: string; text: string; html: string; attachments?: EmailAttachment[] };

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10000;

export async function sendEmail(email: Email): Promise<void> {
  const { resendApiKey, from } = config.email;
  if (!resendApiKey) {
    log.info(`[email] RESEND_API_KEY not set; not sent to ${email.to}: ${email.subject}\n${email.text}`);
    return;
  }
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.contentBase64, content_id: a.contentId })),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Resend refused the email (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
}
