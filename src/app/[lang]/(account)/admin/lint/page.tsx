import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { requireAdminViewer } from '@/server/guard';
import OkfLint, { type LintCheck, type LintSeverity } from '@/server/model/okfLint';
import { AdminTabs } from '../AdminTabs';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin lint' };

const CHECKS: LintCheck[] = ['conformance', 'stale', 'orphan', 'quality', 'contradiction', 'imprecise', 'cluster'];
const SEVERITIES: LintSeverity[] = ['error', 'warning', 'info'];

const TONE: Record<LintSeverity, string> = {
  error: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-subtle',
};

const isCheck = (value?: string): value is LintCheck => CHECKS.includes(value as LintCheck);
const isSeverity = (value?: string): value is LintSeverity => SEVERITIES.includes(value as LintSeverity);

// Every okf:lint finding in one place. The per-pin admin panel shows a pin's
// own findings, which is no use for working through a run of them: after a
// sweep the only way to find the 88 warnings was to open 88 pins. This lists
// them worst first and links each one to its pin.
export default async function AdminLintPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; severity?: string }>;
}) {
  await requireAdminViewer('/admin/lint');
  const params = await searchParams;
  const check = isCheck(params.check) ? params.check : undefined;
  const severity = isSeverity(params.severity) ? params.severity : undefined;
  const [summary, findings] = await Promise.all([OkfLint.summary(), OkfLint.list({ check, severity })]);

  const totals = new Map<LintCheck, { findings: number; pins: number }>();
  for (const row of summary) {
    const prev = totals.get(row.check) ?? { findings: 0, pins: 0 };
    totals.set(row.check, { findings: prev.findings + row.findings, pins: prev.pins + row.pins });
  }
  const href = (next: { check?: LintCheck; severity?: LintSeverity }) => {
    const query = new URLSearchParams();
    if (next.check) query.set('check', next.check);
    if (next.severity) query.set('severity', next.severity);
    const rest = query.toString();
    return rest ? `/admin/lint?${rest}` : '/admin/lint';
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminTabs current="/admin/lint" />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Lint</h1>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={href({ severity })} aria-current={check ? undefined : 'page'} className={`rounded border px-2 py-1 ${check ? 'border-line text-subtle' : 'border-accent text-ink'}`}>
          All checks
        </Link>
        {CHECKS.map((name) => (
          <Link
            key={name}
            href={href({ check: name, severity })}
            aria-current={check === name ? 'page' : undefined}
            className={`rounded border px-2 py-1 ${check === name ? 'border-accent text-ink' : 'border-line text-subtle'}`}
          >
            {name} <span className="text-subtle">{totals.get(name)?.findings ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={href({ check })} aria-current={severity ? undefined : 'page'} className={`rounded border px-2 py-1 ${severity ? 'border-line text-subtle' : 'border-accent text-ink'}`}>
          Any severity
        </Link>
        {SEVERITIES.map((name) => (
          <Link
            key={name}
            href={href({ check, severity: name })}
            aria-current={severity === name ? 'page' : undefined}
            className={`rounded border px-2 py-1 ${severity === name ? 'border-accent text-ink' : 'border-line text-subtle'}`}
          >
            {name} <span className="text-subtle">{summary.filter((r) => r.severity === name).reduce((n, r) => n + r.findings, 0)}</span>
          </Link>
        ))}
      </div>

      {findings.length === 0 ? (
        <p className="text-subtle">Nothing to report for this filter.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {findings.map((finding) => (
            <li key={finding.id} className="py-3">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded px-1.5 py-0.5 font-medium ${TONE[finding.severity]}`}>{finding.severity}</span>
                <span className="text-subtle">{finding.check}</span>
                {finding.pinId ? (
                  <Link href={`/pin/${finding.pinId}`} className="font-medium">
                    #{finding.pinId} {finding.title}
                  </Link>
                ) : (
                  <span className="text-subtle">no pin</span>
                )}
                {finding.userName ? <span className="text-subtle">{finding.userName}</span> : null}
                {finding.day ? <span className="text-subtle">{finding.day}</span> : null}
              </div>
              <p className="text-sm text-ink">{finding.message}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-subtle">Showing up to 200 findings; narrow with a check or severity above.</p>
    </div>
  );
}
