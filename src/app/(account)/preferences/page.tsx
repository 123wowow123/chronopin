import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import { PreferencesForm } from './PreferencesForm';

export const metadata: Metadata = { title: 'Preferences' };

export default async function PreferencesPage() {
  const user = await requireViewer('/preferences');
  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-3xl">Preferences</h1>
      <PreferencesForm userId={user.id} initial={user.defaultFilterSpanPreference ?? null} />
    </div>
  );
}
