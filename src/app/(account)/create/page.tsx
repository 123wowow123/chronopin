import type { Metadata } from 'next';
import { PinForm } from '@/components/forms/PinForm';
import { requireViewer } from '@/server/guard';

export const metadata: Metadata = { title: 'Create Pin' };

export default async function CreatePage() {
  await requireViewer('/create');
  return <PinForm mode="create" />;
}
