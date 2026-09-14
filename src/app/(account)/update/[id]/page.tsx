import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PinForm } from '@/components/forms/PinForm';
import { toJson, type PinJson } from '@/lib/types';
import { requireViewer } from '@/server/guard';
import Pin from '@/server/model/pin';

// Reads the session, so it blocks per request (see ../../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Edit Pin' };

export default async function UpdatePage({ params }: PageProps<'/update/[id]'>) {
  const id = Number((await params).id);
  const user = await requireViewer(`/update/${id}`);
  // Loaded fresh (not from the page cache): the form must start from exactly
  // what is stored, or saving would write stale values back.
  const { pin } = Number.isInteger(id) ? await Pin.queryById(id, user.id) : { pin: undefined };
  if (!pin) {
    notFound();
  }
  if (user.role !== 'admin' && pin.userId !== user.id) {
    redirect(`/pin/${id}`);
  }
  return <PinForm mode="edit" pin={toJson<PinJson>(pin)} />;
}
