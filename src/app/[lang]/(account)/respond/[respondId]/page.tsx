import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QuickPinForm } from '@/components/forms/QuickPinForm';
import { requireViewer } from '@/server/guard';
import { pinById } from '@/server/services/pages';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('form.respondPin') };
}

export default async function RespondPage({ params }: PageProps<'/[lang]/respond/[respondId]'>) {
  const id = Number((await params).respondId);
  await requireViewer(`/respond/${id}`);
  const parent = Number.isInteger(id) ? await pinById(id) : null;
  if (!parent) {
    notFound();
  }
  return <QuickPinForm respondTo={parent} />;
}
