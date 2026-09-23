import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { resendVerificationEmail } from '@/server/emailVerification';
import { json, route } from '@/server/http';

// Send the confirmation link again (the banner's button). A no-op answer for
// an account that is already confirmed, so a stale banner cannot send mail.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (user.emailVerifiedDateTime) return json({ verified: true });
  await resendVerificationEmail(user, request);
  return json({ sent: true });
});
