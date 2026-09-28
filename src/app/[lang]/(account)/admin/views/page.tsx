import type { Metadata } from 'next';
import { connection } from 'next/server';
import { rangeStartDay } from '@/lib/viewStats';
import { TIME_RANGES } from '@/lib/timeStats';
import { requireAdminViewer } from '@/server/guard';
import PinView from '@/server/model/pinView';
import log from '@/server/util/log';
import { AdminTabs } from '../AdminTabs';
import { ViewCharts, type RangeSummary } from './ViewCharts';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin views' };

// How long the page waits for new views to be placed (as on the Clicks page:
// past this they show unplaced and the lookup finishes for the next open).
const LOCATE_WAIT_MS = 15000;

export default async function AdminViewsPage() {
  await requireAdminViewer('/admin/views');
  await connection();
  const locating = PinView.locateUnlocated().catch((err) => log.error('locatePinViews', (err as Error)?.message));
  await Promise.race([locating, new Promise((resolve) => setTimeout(resolve, LOCATE_WAIT_MS))]);
  const now = new Date();
  // Distinct viewers and top pins can't be summed from daily counts, so each
  // range is summarised here; the chart itself is bucketed in the browser.
  const [days, latest, ...summaries] = await Promise.all([
    PinView.listDaily(),
    PinView.latest(),
    ...TIME_RANGES.map((r) => PinView.summarize(rangeStartDay(r.id, now))),
  ]);
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/views" />
      <h1 className="sr-only">Views</h1>
      <p className="mb-6 text-sm text-subtle">
        Pin page visits, counted once per viewer per pin per UTC day. Crawlers, card impressions and outbound clicks are not counted. Places come from the
        address of the day&apos;s first visit, so they are the city of the network, not of the person; visits before 27 September 2026 have no address.
      </p>
      <ViewCharts
        days={days}
        latest={latest}
        summaries={Object.fromEntries(TIME_RANGES.map((r, i) => [r.id, summaries[i]])) as Record<string, RangeSummary>}
        serverNow={now.toISOString()}
      />
    </div>
  );
}
