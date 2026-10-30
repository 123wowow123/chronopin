import type { Metadata } from 'next';
import { connection } from 'next/server';
import Link from '@/components/ui/Link';
import { requireAdminViewer } from '@/server/guard';
import { getWeeklyDigest } from '@/server/model/appSetting';
import Digest from '@/server/model/digest';
import { AdminTabs } from '../AdminTabs';
import { DigestControls } from './DigestControls';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin digest' };

const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '–');

// The weekly "my timeline" email: who gets it, what went out each week, and
// what it brought back. Opens are a pixel, so they overstate (mail apps that
// prefetch images count) and miss anyone who blocks images; clicks are exact.
export default async function AdminDigestPage() {
  await requireAdminViewer('/admin/digest');
  await connection();
  const [setting, summary, weeks, top, sends] = await Promise.all([getWeeklyDigest(), Digest.summary(), Digest.weeks(), Digest.topClicked(), Digest.recentSends()]);
  const latest = weeks[0];

  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/digest" />
      <h1 className="sr-only">Digest</h1>
      <p className="mb-6 max-w-3xl text-sm text-subtle">
        The weekly &ldquo;my timeline&rdquo; email. Everyone with a confirmed email gets it unless they switch it off on the Notifications tab of their profile; every email carries an unsubscribe link.
      </p>

      <DigestControls saved={setting} />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Get the email" value={summary.subscribers} note={`${summary.verified.toLocaleString()} with a confirmed email`} />
        <Stat label="Something to send" value={summary.withInterests} note="watch or follow something" />
        <Stat label="Unsubscribed" value={summary.optedOut} />
        <Stat label="Last week sent" value={latest?.sent ?? 0} note={latest ? `week of ${latest.week}` : 'none yet'} />
        <Stat label="Last week opened" value={latest?.opened ?? 0} note={latest ? percent(latest.opened, latest.sent) : undefined} />
        <Stat label="Last week clicked" value={latest?.clicked ?? 0} note={latest ? percent(latest.clicked, latest.sent) : undefined} />
      </div>

      <Section title="By week">
        <Table head={['Week of', 'Sent', 'Nothing coming', 'Failed', 'Pins listed', 'Opened', 'Clicked', 'Clicks']}>
          {weeks.map((w) => (
            <tr key={w.week} className="border-t border-line">
              <td className="py-1.5 pr-3">{w.week}</td>
              <td className="py-1.5 pr-3 text-right">{w.sent}</td>
              <td className="py-1.5 pr-3 text-right text-subtle">{w.skipped}</td>
              <td className={`py-1.5 pr-3 text-right ${w.failed ? 'text-danger' : 'text-subtle'}`}>{w.failed + w.pending}</td>
              <td className="py-1.5 pr-3 text-right">{w.pins}</td>
              <td className="py-1.5 pr-3 text-right">
                {w.opened} <span className="text-subtle">{percent(w.opened, w.sent)}</span>
              </td>
              <td className="py-1.5 pr-3 text-right">
                {w.clicked} <span className="text-subtle">{percent(w.clicked, w.sent)}</span>
              </td>
              <td className="py-1.5 text-right">{w.clicks}</td>
            </tr>
          ))}
        </Table>
        {weeks.length ? null : <p className="py-3 text-sm text-subtle">Nothing has been sent yet.</p>}
      </Section>

      <Section title="Most clicked">
        <Table head={['Page', 'Clicks']}>
          {top.map((row) => (
            <tr key={row.path} className="border-t border-line">
              <td className="max-w-0 truncate py-1.5 pr-3" title={row.path}>
                <Link href={row.path}>{row.path}</Link>
              </td>
              <td className="py-1.5 text-right">{row.clicks}</td>
            </tr>
          ))}
        </Table>
        {top.length ? null : <p className="py-3 text-sm text-subtle">No link has been clicked yet.</p>}
      </Section>

      <Section title="Recent emails">
        <Table head={['User', 'Week of', 'Status', 'Pins', 'Opens', 'Clicks', 'Sent']}>
          {sends.map((s) => (
            <tr key={s.id} className="border-t border-line">
              <td className="truncate py-1.5 pr-3">{s.userName}</td>
              <td className="py-1.5 pr-3">{s.weekStart}</td>
              <td className={`py-1.5 pr-3 ${s.status === 'failed' ? 'text-danger' : ''}`} title={s.error ?? undefined}>
                {s.status}
              </td>
              <td className="py-1.5 pr-3 text-right">{s.pinCount}</td>
              <td className="py-1.5 pr-3 text-right">{s.openCount}</td>
              <td className="py-1.5 pr-3 text-right">{s.clickCount}</td>
              <td className="py-1.5 text-subtle">{s.sentAt ? s.sentAt.replace('T', ' ').replace('Z', ' UTC') : ''}</td>
            </tr>
          ))}
        </Table>
        {sends.length ? null : <p className="py-3 text-sm text-subtle">Nothing has been sent yet.</p>}
      </Section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="text-xs text-subtle">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      {note ? <div className="text-xs text-subtle">{note}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3 overflow-x-auto">{children}</div>
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-left text-sm tabular-nums">
      <thead className="text-subtle">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`py-1 pr-3 font-medium ${i > 0 && h !== 'Status' && h !== 'Sent' && h !== 'Page' ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
