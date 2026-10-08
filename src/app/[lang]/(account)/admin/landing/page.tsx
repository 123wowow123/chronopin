import type { Metadata } from 'next';
import { rangeStartDay } from '@/lib/viewStats';
import { TIME_RANGES } from '@/lib/timeStats';
import { requireAdminViewer } from '@/server/guard';
import LandingVisit from '@/server/model/landingVisit';
import { AdminTabs } from '../AdminTabs';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin landing pages' };

function Table({ head, rows }: { head: [string, string]; rows: [string, number][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-subtle">
          <th className="py-1 pr-4 font-medium">{head[0]}</th>
          <th className="py-1 text-right font-medium">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map(([name, hits]) => (
            <tr key={name} className="border-b border-line/50">
              <td className="py-1 pr-4 break-all">{name}</td>
              <td className="py-1 text-right tabular-nums">{hits.toLocaleString('en-US')}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={2} className="py-3 text-subtle">No visits yet.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default async function AdminLandingPage() {
  await requireAdminViewer('/admin/landing');
  // Whatever the proxy has counted but not written yet goes in first.
  await LandingVisit.flush();
  const now = new Date();
  const ranges = await Promise.all(
    TIME_RANGES.slice(0, 2).map(async (r) => {
      const since = rangeStartDay(r.id, now);
      const [days, summary] = await Promise.all([LandingVisit.listDaily(since), LandingVisit.summarize(since)]);
      return { r, days, summary, total: days.reduce((n, d) => n + d.hits, 0) };
    }),
  );
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/landing" />
      <h1 className="sr-only">Landing pages</h1>
      <p className="mb-6 text-sm text-subtle">
        Visits by real browsers (not admins) to the restaurant guides (/restaurants and the city pages), by page and by where the visitor came from, and which restaurant they open. Bots
        are on the Bots tab; prefetches and reloads are not counted, and a viewer counts once a day. A page that opens inside the site counts as one visit from &quot;internal&quot;.
      </p>
      {ranges.map(({ r, days, summary, total }) => (
        <section key={r.id} className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">
            Last {r.label}: {total.toLocaleString('en-US')} visits
          </h2>
          <div className="mb-8">
            <Table
              head={['Restaurant opened from a landing page', 'Clicks']}
              rows={summary.restaurants.map((c) => [`${c.title ?? 'Deleted pin'} (#${c.pinId})`, c.hits])}
            />
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <Table head={['Page', 'Visits']} rows={summary.pages.map((p) => [p.path, p.hits])} />
            <Table head={['Source', 'Visits']} rows={summary.sources.map((s) => [s.source, s.hits])} />
            <Table head={['Day (UTC)', 'Visits']} rows={days.slice(0, 14).map((d) => [d.day, d.hits])} />
          </div>
        </section>
      ))}
    </div>
  );
}
