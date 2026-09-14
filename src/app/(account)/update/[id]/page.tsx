import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PinForm } from '@/components/forms/PinForm';
import { toJson, type PinJson } from '@/lib/types';
import { requireViewer } from '@/server/guard';
import Pin from '@/server/model/pin';

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
