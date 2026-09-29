import type { Metadata } from 'next';
import { connection } from 'next/server';
import { requireAdminViewer } from '@/server/guard';
import ShopClick from '@/server/model/shopClick';
import log from '@/server/util/log';
import { AdminTabs } from '../AdminTabs';
import { ClickCharts } from './ClickCharts';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin clicks' };

// How long the page waits for new clicks to be placed. The first open after a
// deploy downloads the address database (src/server/ipLocation.ts); past this
// the page shows them unplaced and the lookup finishes for the next open.
const LOCATE_WAIT_MS = 15000;

export default async function AdminClicksPage() {
  await requireAdminViewer('/admin/clicks');
  // The time the ranges count back from is this request's, not a prerender's.
  await connection();
  const locating = ShopClick.locateUnlocated().catch((err) => log.error('locateShopClicks', (err as Error)?.message));
  await Promise.race([locating, new Promise((resolve) => setTimeout(resolve, LOCATE_WAIT_MS))]);
  const clicks = await ShopClick.list();
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/clicks" />
      <h1 className="sr-only">Clicks</h1>
      <p className="mb-6 text-sm text-subtle">
        Clicks on product pins&apos; buy buttons, by the signed-in user or else the address. A click on the same button again within 30 seconds counts once. Places
        come from the address, so they are the city of the network, not of the person.
      </p>
      <ClickCharts clicks={clicks} serverNow={new Date().toISOString()} />
    </div>
  );
}
