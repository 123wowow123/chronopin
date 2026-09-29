import type { Metadata } from 'next';
import { connection } from 'next/server';
import { toJson } from '@/lib/types';
import { requireAdminViewer } from '@/server/guard';
import Listing from '@/server/model/listing';
import { AdminTabs } from '../AdminTabs';
import { type AdminListingRow, ListingsDashboard } from './ListingsDashboard';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin listings' };

// Every private-seller listing (0095): how many are open, pending and closed,
// how they are posted over time, and the listings themselves to browse by
// status. Deleted ones are kept apart as removed.
export default async function AdminListingsPage() {
  await requireAdminViewer('/admin/listings');
  // The time the ranges count back from is this request's, not a prerender's.
  await connection();
  const listings = await Listing.admin();
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/listings" />
      <h1 className="sr-only">Listings</h1>
      <p className="mb-6 text-sm text-subtle">
        Listings private sellers posted, on a product pin or on their own. Open is still available, pending is on hold for a buyer, closed is
        marked sold. Listings their sellers deleted count as removed.
      </p>
      <ListingsDashboard listings={toJson<AdminListingRow[]>(listings)} serverNow={new Date().toISOString()} />
    </div>
  );
}
