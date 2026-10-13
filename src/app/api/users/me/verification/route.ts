import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { emailConfirmationPending } from '@/lib/emailConfirmation';
import { resendVerificationEmail } from '@/server/emailVerification';
import { json, route } from '@/server/http';

// Send the confirmation link again (the banner's button). A no-op answer for
// an account that is already confirmed, so a stale banner cannot send mail.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  // Nothing to send to an account with no email, and nothing to confirm.
  if (!emailConfirmationPending(user)) return json({ verified: true });
  await resendVerificationEmail(user, request);
  return json({ sent: true });
});
