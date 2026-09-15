import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import { PreferencesForm } from './PreferencesForm';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Preferences' };

export default async function PreferencesPage() {
  const user = await requireViewer('/preferences');
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Preferences</h1>
      <p className="mb-6 text-sm text-subtle">How the timeline opens for you.</p>
      <PreferencesForm userId={user.id} initial={user.defaultFilterSpanPreference ?? null} />
    </div>
  );
}
