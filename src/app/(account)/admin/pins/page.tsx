import type { Metadata } from 'next';
import { confidenceStats, isHidden } from '@/lib/confidenceStats';
import { requireAdminViewer } from '@/server/guard';
import Pins from '@/server/model/pins';
import { AdminTabs } from '../AdminTabs';
import { PinTimeCharts } from './PinTimeCharts';
import { VisibilityCharts } from './VisibilityCharts';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin pins' };

export default async function AdminPinsPage() {
  await requireAdminViewer('/admin/pins');
  const rows = await Pins.listConfidence();
  const stats = confidenceStats(rows);
  const created = rows.map((r) => ({ created: new Date(r.utcCreatedDateTime).toISOString(), hidden: isHidden(r.confidence, stats.threshold) }));
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminTabs current="/admin/pins" />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Pins</h1>
      <p className="mb-6 text-sm text-subtle">
        The home timeline hides pins whose confidence is below {stats.threshold}. Pins with no score still show. Watched lists, search and
        the map show every pin.
      </p>
      <PinTimeCharts pins={created} serverNow={new Date().toISOString()} />
      <VisibilityCharts stats={stats} />
    </div>
  );
}
