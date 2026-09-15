import type { Metadata } from 'next';
import { PinForm } from '@/components/forms/PinForm';
import { requireViewer } from '@/server/guard';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Create Pin' };

export default async function CreatePage() {
  await requireViewer('/create');
  return <PinForm mode="create" />;
}
