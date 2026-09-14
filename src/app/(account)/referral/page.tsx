import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { REFERRAL_HTML } from './referralLinks';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Referral' };

export default async function ReferralPage() {
  await requireAdminViewer('/referral');
  return <div className="mx-auto max-w-3xl px-4 py-10 [&_a]:text-link" dangerouslySetInnerHTML={{ __html: REFERRAL_HTML }} />;
}
