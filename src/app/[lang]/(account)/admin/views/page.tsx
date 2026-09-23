import type { Metadata } from 'next';
import { rangeStartDay } from '@/lib/viewStats';
import { TIME_RANGES } from '@/lib/timeStats';
import { requireAdminViewer } from '@/server/guard';
import PinView from '@/server/model/pinView';
import { AdminTabs } from '../AdminTabs';
import { ViewCharts, type RangeSummary } from './ViewCharts';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin views' };

export default async function AdminViewsPage() {
  await requireAdminViewer('/admin/views');
  const now = new Date();
  // Distinct viewers and top pins can't be summed from daily counts, so each
  // range is summarised here; the chart itself is bucketed in the browser.
  const [days, ...summaries] = await Promise.all([
    PinView.listDaily(),
    ...TIME_RANGES.map((r) => PinView.summarize(rangeStartDay(r.id, now))),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/views" />
      <h1 className="sr-only">Views</h1>
      <p className="mb-6 text-sm text-subtle">
        Pin page visits, counted once per viewer per pin per UTC day. Crawlers, card impressions and outbound clicks are not counted.
      </p>
      <ViewCharts
        days={days}
        summaries={Object.fromEntries(TIME_RANGES.map((r, i) => [r.id, summaries[i]])) as Record<string, RangeSummary>}
        serverNow={now.toISOString()}
      />
    </div>
  );
}
