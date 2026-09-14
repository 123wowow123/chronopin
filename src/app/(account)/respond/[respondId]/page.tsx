import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PinForm } from '@/components/forms/PinForm';
import { requireViewer } from '@/server/guard';
import { pinById } from '@/server/services/pages';

// Reads the session, so it blocks per request (see ../../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Respond to Pin' };

export default async function RespondPage({ params }: PageProps<'/respond/[respondId]'>) {
  const id = Number((await params).respondId);
  await requireViewer(`/respond/${id}`);
  const parent = Number.isInteger(id) ? await pinById(id) : null;
  if (!parent) {
    notFound();
  }
  return <PinForm mode="respond" respondTo={parent} />;
}
