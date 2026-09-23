import type { Metadata } from 'next';
import { rangeStartDay } from '@/lib/viewStats';
import { TIME_RANGES } from '@/lib/timeStats';
import { requireAdminViewer } from '@/server/guard';
import BotVisit from '@/server/model/botVisit';
import { AdminTabs } from '../AdminTabs';
import { BotCharts, type BotSummary } from './BotCharts';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin bots' };

export default async function AdminBotsPage() {
  await requireAdminViewer('/admin/bots');
  // Whatever the proxy has counted but not written yet goes in first, so the
  // page is current to the second.
  await BotVisit.flush();
  const now = new Date();
  const [days, ...summaries] = await Promise.all([
    BotVisit.listDaily(),
    ...TIME_RANGES.map((r) => BotVisit.summarize(rangeStartDay(r.id, now))),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/bots" />
      <h1 className="sr-only">Bots</h1>
      <p className="mb-6 text-sm text-subtle">
        Pages requested by crawlers and other bots, which Views leaves out, named from the user agent each one sends. A user agent can be faked,
        so a name here is what the bot claims to be.
      </p>
      <BotCharts
        days={days}
        summaries={Object.fromEntries(TIME_RANGES.map((r, i) => [r.id, summaries[i]])) as Record<string, BotSummary>}
        serverNow={now.toISOString()}
      />
    </div>
  );
}
