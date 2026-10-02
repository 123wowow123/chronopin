import type { Metadata } from 'next';
import { connection } from 'next/server';
import { requireAdminViewer } from '@/server/guard';
import Ad from '@/server/model/ad';
import { AMAZON_STORES, GLOBAL_EARNING_STORES } from '@/lib/ads';
import { amazonAssociateTag } from '@/lib/affiliate';
import { getAdPlacements, getAmazonTags } from '@/server/model/appSetting';
import log from '@/server/util/log';
import { AdminTabs } from '../AdminTabs';
import { AdCharts } from './AdCharts';
import { AmazonTagsForm } from './AmazonTagsForm';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin ads' };

// As on the Clicks page: how long the page waits for new clicks to be placed.
const LOCATE_WAIT_MS = 15000;

export default async function AdminAdsPage() {
  await requireAdminViewer('/admin/ads');
  await connection();
  const locating = Ad.locateUnlocated().catch((err) => log.error('locateAdClicks', (err as Error)?.message));
  await Promise.race([locating, new Promise((resolve) => setTimeout(resolve, LOCATE_WAIT_MS))]);
  const [clicks, impressions, placements, tags, adCounts] = await Promise.all([Ad.clicks(), Ad.impressions(), getAdPlacements(), getAmazonTags(), Ad.storeAdCounts()]);
  const regions = new Intl.DisplayNames(['en'], { type: 'region' });
  const stores = Object.entries(AMAZON_STORES)
    .filter(([code]) => code !== 'US')
    .map(([code, host]) => ({ code, host, name: regions.of(code) ?? code, ads: adCounts[code] ?? 0, global: GLOBAL_EARNING_STORES.has(code) }))
    .sort((a, b) => b.ads - a.ads || a.name.localeCompare(b.name));
  const labels = await Ad.labels([...new Set([...clicks.map((c) => c.adKey), ...impressions.map((i) => i.adKey)])]);
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/ads" />
      <h1 className="sr-only">Ads</h1>
      <p className="mb-6 text-sm text-subtle">
        The Amazon ad blocks on the timeline and pin pages. An ad counts as shown when its block came near the screen and fetched it; a click on the same ad
        again within 30 seconds counts once. Program ads are Amazon&apos;s Special Program Commissions, Bonus Events and Trade-In; product ads are the Amazon
        listings on pins. Program ads cover the stores listed under Amazon tracking ids below; product ads are Amazon US listings that Amazon sends to a shopper&apos;s local store in the Global Earning countries.
      </p>
      <AmazonTagsForm saved={tags} stores={stores} usTag={amazonAssociateTag} />
      <AdCharts clicks={clicks} impressions={impressions} labels={labels} serverNow={new Date().toISOString()} placements={placements} />
    </div>
  );
}
