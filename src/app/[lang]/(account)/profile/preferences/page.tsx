import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import { userLocation } from '@/lib/location';
import { CardStockPricesToggle } from '../CardStockPricesToggle';
import { BirthDetailsSetting } from '../BirthDetailsSetting';
import { DefaultLocationSetting } from '../DefaultLocationSetting';
import UserBirth from '@/server/model/userBirth';
import { LanguageSetting } from '../LanguageSetting';
import { PreferencesForm } from '../PreferencesForm';
import { ProfileTabs } from '../ProfileTabs';
import { ThemePicker } from '../ThemePicker';
import { getT } from '@/lib/i18n/server';
import { localesOffered } from '@/server/services/multilingual';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('profile.preferences') };
}

// How the app looks and behaves for you, a tab of the profile.
export default async function PreferencesPage() {
  const user = await requireViewer('/profile/preferences');
  const [t, offered, birth] = await Promise.all([getT(), localesOffered(), UserBirth.get(user.id)]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 lg:max-w-5xl">
      <ProfileTabs current="/profile/preferences" />
      <h1 className="sr-only">{t('profile.preferences')}</h1>
      <p className="mb-6 text-sm text-subtle">{t('profile.preferencesIntro')}</p>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <ThemePicker userId={user.id} />
        {offered.length ? <LanguageSetting userId={user.id} offered={offered} /> : null}
        <PreferencesForm userId={user.id} initial={user.defaultFilterSpanPreference ?? null} />
        <CardStockPricesToggle userId={user.id} initial={user.showCardStockPrices !== false} />
        <DefaultLocationSetting userId={user.id} initial={{ location: userLocation(user), locationFromDevice: user.locationFromDevice !== false }} />
        <BirthDetailsSetting initial={{ time: birth?.time ?? null, placeName: birth?.placeName ?? null, latitude: birth?.latitude ?? null, longitude: birth?.longitude ?? null }} />
      </div>
    </div>
  );
}
