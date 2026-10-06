import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { getAutoTranslate, getMultilingual, getPersonalBag, getSiteVerification, getSliderTyping, getAdPlacements, getAdsenseSlots, getTimelineVideo, getWebOverlay } from '@/server/model/appSetting';
import UserWiki from '@/server/model/userWiki';
import { translationCoverage } from '@/server/services/translations';
import { AdminTabs } from '../AdminTabs';
import { AdPlacementsForm } from './AdPlacementsForm';
import { AdsenseSlotsForm } from './AdsenseSlotsForm';
import { AutoTranslateForm } from './AutoTranslateForm';
import { MultilingualForm } from './MultilingualForm';
import { PersonalBagForm } from './PersonalBagForm';
import { SiteVerificationForm } from './SiteVerificationForm';
import { SliderTypingForm } from './SliderTypingForm';
import { TimelineVideoForm } from './TimelineVideoForm';
import { WebOverlayForm } from './WebOverlayForm';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin settings' };

// The site-wide switches for what visitors see: the cards, the filters, and
// how a crowded day picks its pins. Each saves on its own, straight away.
export default async function AdminSettingsPage() {
  await requireAdminViewer('/admin/settings');
  const [video, typing, webOverlay, personal, wikis, multilingual, coverage, autoTranslate, siteVerification, adPlacements, adsense] = await Promise.all([
    getTimelineVideo(),
    getSliderTyping(),
    getWebOverlay(),
    getPersonalBag(),
    UserWiki.count(),
    getMultilingual(),
    translationCoverage(),
    getAutoTranslate(),
    getSiteVerification(),
    getAdPlacements(),
    getAdsenseSlots(),
  ]);
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/settings" />
      <h1 className="sr-only">Settings</h1>
      <TimelineVideoForm saved={video} />
      <SliderTypingForm saved={typing} />
      <WebOverlayForm saved={webOverlay} />
      <PersonalBagForm saved={personal} wikis={wikis} />
      <MultilingualForm saved={multilingual} coverage={coverage} />
      <AutoTranslateForm saved={autoTranslate} />
      <AdPlacementsForm saved={adPlacements} />
      <AdsenseSlotsForm saved={adsense} />
      <SiteVerificationForm saved={siteVerification} />
    </div>
  );
}
