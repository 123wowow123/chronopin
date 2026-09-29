import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getT, redirect } from '@/lib/i18n/server';
import { PinForm } from '@/components/forms/PinForm';
import { toJson, type PinJson } from '@/lib/types';
import { requireViewer } from '@/server/guard';
import Pin from '@/server/model/pin';

// Reads the session, so it blocks per request (see ../../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('form.editPin') };
}

export default async function UpdatePage({ params }: PageProps<'/[lang]/update/[id]'>) {
  const id = Number((await params).id);
  const user = await requireViewer(`/update/${id}`);
  // Loaded fresh (not from the page cache): the form must start from exactly
  // what is stored, or saving would write stale values back.
  const { pin } = Number.isInteger(id) ? await Pin.queryById(id, user.id) : { pin: undefined };
  if (!pin) {
    notFound();
  }
  if (user.role !== 'admin' && pin.userId !== user.id) {
    await redirect(`/pin/${id}`);
  }
  return <PinForm mode="edit" pin={toJson<PinJson>(pin)} />;
}
