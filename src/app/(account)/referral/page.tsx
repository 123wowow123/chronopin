import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { REFERRAL_HTML } from './referralLinks';

export const metadata: Metadata = { title: 'Referral' };

export default async function ReferralPage() {
  await requireAdminViewer('/referral');
  return <div className="px-4 py-6 [&_a]:text-link" dangerouslySetInnerHTML={{ __html: REFERRAL_HTML }} />;
}
