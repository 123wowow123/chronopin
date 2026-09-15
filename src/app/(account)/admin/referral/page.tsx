import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { AdminTabs } from '../AdminTabs';
import { REFERRAL_HTML } from './referralLinks';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Referral links' };

export default async function AdminReferralPage() {
  await requireAdminViewer('/admin/referral');
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminTabs current="/admin/referral" />
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        Referral links
        <span className="rounded-full px-2 py-0.5 text-xs font-medium text-subtle ring-1 ring-line ring-inset">Deprecated</span>
      </h1>
      <p className="mb-6 text-sm text-subtle">
        Legacy affiliate links carried over from the Angular app. Pins link to merchants directly now; these are kept for reference only.
      </p>
      <div className="[&_a]:text-link" dangerouslySetInnerHTML={{ __html: REFERRAL_HTML }} />
    </div>
  );
}
