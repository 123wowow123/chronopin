import Anchor from '@/components/ui/Anchor';
import { formatDayKey } from '@/lib/format';
import type { Translator } from '@/lib/i18n/translate';
import type { UnconfirmedReport } from '@/lib/unconfirmedReports';

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// What has been reported about a pin's event but not confirmed
// (lib/unconfirmedReports.ts), under the market odds: dashed and labelled, so it
// cannot be taken for the pin's own facts.
export function PinUnconfirmedReports({ reports, t }: { reports: UnconfirmedReport[]; t: Translator }) {
  if (!reports.length) return null;
  return (
    <section aria-labelledby="unconfirmed-heading" className="mb-4 rounded-lg border border-dashed border-warning/50 bg-warning/5 px-3 py-2 text-sm">
      <h2 id="unconfirmed-heading" className="text-[11px] font-semibold tracking-wider text-warning uppercase">
        {t('unconfirmed.heading')}
      </h2>
      <ul className="mt-1 flex flex-col gap-2">
        {reports.map((report) => (
          <li key={report.url}>
            {/* The report's text is stored in English. */}
            <p lang="en" dir="ltr" className="text-ink">
              {report.text}
            </p>
            <p className="mt-0.5 text-xs text-subtle">
              <Anchor href={report.url} target="_blank" rel="noopener noreferrer nofollow" title={report.title ?? undefined}>
                {host(report.url)}
              </Anchor>
              {report.publishedDate ? ` · ${formatDayKey(report.publishedDate, t.locale)}` : ''}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-subtle">{t('unconfirmed.note')}</p>
    </section>
  );
}
