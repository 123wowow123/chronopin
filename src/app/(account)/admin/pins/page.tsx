import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { getTimelineConfidence } from '@/server/model/appSetting';
import Pins from '@/server/model/pins';
import { AdminTabs } from '../AdminTabs';
import { PinsDashboard } from './PinsDashboard';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin pins' };

export default async function AdminPinsPage() {
  await requireAdminViewer('/admin/pins');
  const [rows, setting] = await Promise.all([Pins.listConfidence(), getTimelineConfidence()]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminTabs current="/admin/pins" />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Pins</h1>
      <PinsDashboard
        rows={rows.map((r) => ({
          category: r.category,
          userName: r.userName,
          confidence: r.confidence,
          created: new Date(r.utcCreatedDateTime).toISOString(),
        }))}
        saved={setting}
        serverNow={new Date().toISOString()}
      />
    </div>
  );
}
