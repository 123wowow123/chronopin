import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import { userLocation } from '@/lib/location';
import { CardStockPricesToggle } from '../CardStockPricesToggle';
import { DefaultLocationSetting } from '../DefaultLocationSetting';
import { LanguageSetting } from '../LanguageSetting';
import { PreferencesForm } from '../PreferencesForm';
import { ProfileTabs } from '../ProfileTabs';
import { ThemePicker } from '../ThemePicker';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('profile.preferences') };
}

// How the app looks and behaves for you, a tab of the profile.
export default async function PreferencesPage() {
  const user = await requireViewer('/profile/preferences');
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <ProfileTabs current="/profile/preferences" />
      <h1 className="sr-only">{t('profile.preferences')}</h1>
      <p className="mb-6 text-sm text-subtle">{t('profile.preferencesIntro')}</p>
      <div className="space-y-4">
        <ThemePicker userId={user.id} />
        <LanguageSetting userId={user.id} />
        <PreferencesForm userId={user.id} initial={user.defaultFilterSpanPreference ?? null} />
        <CardStockPricesToggle userId={user.id} initial={user.showCardStockPrices !== false} />
        <DefaultLocationSetting userId={user.id} initial={{ location: userLocation(user), locationFromDevice: user.locationFromDevice !== false }} />
      </div>
    </div>
  );
}
