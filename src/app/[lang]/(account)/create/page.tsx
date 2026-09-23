import type { Metadata } from 'next';
import { QuickPinForm } from '@/components/forms/QuickPinForm';
import { requireViewer } from '@/server/guard';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('form.createPin') };
}

export default async function CreatePage() {
  await requireViewer('/create');
  return <QuickPinForm />;
}
