import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import CompanyBlock from '@/server/model/companyBlock';
import UserBlock from '@/server/model/userBlock';
import { toJson } from '@/lib/types';
import { BlockedList } from '../BlockedList';
import { ProfileTabs } from '../ProfileTabs';
import { getT } from '@/lib/i18n/server';
import type { BlockedCompany, BlockedUser } from '@/lib/client/blocks';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('profile.blocked') };
}

// The people (0076) and companies (0078) you blocked, a tab of the profile.
export default async function BlockedPage() {
  const user = await requireViewer('/profile/blocked');
  const [users, companies, t] = await Promise.all([UserBlock.list(user.id), CompanyBlock.list(user.id), getT()]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <ProfileTabs current="/profile/blocked" />
      <h1 className="sr-only">{t('profile.blocked')}</h1>
      <p className="mb-6 text-sm text-subtle">{t('profile.blockedIntro')}</p>
      <BlockedList initialUsers={toJson<BlockedUser[]>(users)} initialCompanies={toJson<BlockedCompany[]>(companies)} />
    </div>
  );
}
