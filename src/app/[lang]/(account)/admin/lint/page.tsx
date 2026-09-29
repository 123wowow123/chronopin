import { redirect } from '@/lib/i18n/server';

// Lint is a tab inside Jobs now (/admin/jobs/lint); old links land on it,
// with their filter.
export default async function AdminLintPage({ searchParams }: { searchParams: Promise<{ check?: string; severity?: string }> }) {
  const { check, severity } = await searchParams;
  const query = new URLSearchParams();
  if (check) query.set('check', check);
  if (severity) query.set('severity', severity);
  const rest = query.toString();
  await redirect(`/admin/jobs/lint${rest ? `?${rest}` : ''}`);
}
