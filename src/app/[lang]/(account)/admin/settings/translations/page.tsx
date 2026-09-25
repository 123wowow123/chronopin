import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { LOCALE_NAMES } from '@/lib/i18n/config';
import { TARGET_LOCALES, type TargetLocale } from '@/server/extract/translate';
import { requireAdminViewer } from '@/server/guard';
import { getMultilingual } from '@/server/model/appSetting';
import type { TranslatedField } from '@/server/model/pinTranslation';
import { translationCoverage, translationsToRedo } from '@/server/services/translations';
import { AdminTabs } from '../../AdminTabs';

// Reads the session, so it blocks per request (see ../../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin translations' };

const STATES = ['outdated', 'incomplete', 'missing'] as const;
type State = (typeof STATES)[number];

const STATE_LABELS: Record<State, string> = { outdated: 'Outdated', incomplete: 'Incomplete', missing: 'Missing' };

const FIELD_LABELS: Record<TranslatedField, string> = {
  title: 'title',
  description: 'description',
  longFormSummary: 'key points',
  dateConfidenceReasoning: 'date reasoning',
  delayReasoning: 'delay reasoning',
};

const when = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

const chip = (on: boolean) =>
  `rounded border px-2 py-1 transition-colors hover:bg-raised hover:no-underline active:bg-raised-2 ${on ? 'border-accent text-ink' : 'border-line text-subtle'}`;

// The pins whose translation a page will not show, so they read in English
// until it is made again (Settings > Other languages links here). Outdated
// ones first: the pin's English was edited after it was translated, and each
// says which fields were (only those need translating again - see
// services/translations.ts applyTranslations). ?state= picks outdated,
// incomplete or missing; ?locale= one language (the offered ones by default).
export default async function AdminTranslationsPage({ searchParams }: { searchParams: Promise<{ state?: string; locale?: string }> }) {
  await requireAdminViewer('/admin/settings/translations');
  const params = await searchParams;
  const state: State = STATES.includes(params.state as State) ? (params.state as State) : 'outdated';
  const one = TARGET_LOCALES.find((l) => l === params.locale);
  const offered = (await getMultilingual()).locales;
  const locales: TargetLocale[] = one ? [one] : offered.length ? offered : [...TARGET_LOCALES];
  const [coverage, { total, pins }] = await Promise.all([translationCoverage(), translationsToRedo(locales, state)]);

  const href = (next: { state?: State; locale?: TargetLocale }) => {
    const query = new URLSearchParams();
    if (next.state && next.state !== 'outdated') query.set('state', next.state);
    if (next.locale) query.set('locale', next.locale);
    const rest = query.toString();
    return `/admin/settings/translations${rest ? `?${rest}` : ''}`;
  };
  const count = (s: State, l: TargetLocale) =>
    s === 'missing' ? coverage.total - coverage.current[l] - coverage.outdated[l] - coverage.incomplete[l] : coverage[s][l];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/settings" />
      <h1 className="text-base font-semibold">Translations to make again</h1>
      <p className="mt-1 mb-4 text-sm text-subtle">
        A page in another language shows a pin&apos;s translation only while it was made from the pin&apos;s English as it is now; these
        show in English instead. <Link href="/admin/settings">Back to settings</Link>
      </p>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {STATES.map((s) => (
          <Link key={s} href={href({ state: s, locale: one })} aria-current={s === state ? 'page' : undefined} className={chip(s === state)}>
            {STATE_LABELS[s]} <span className="text-subtle tabular-nums">{locales.reduce((n, l) => n + count(s, l), 0).toLocaleString('en-US')}</span>
          </Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={href({ state })} aria-current={one ? undefined : 'page'} className={chip(!one)}>
          {offered.length ? 'Offered languages' : 'All languages'}
        </Link>
        {TARGET_LOCALES.map((l) => (
          <Link key={l} href={href({ state, locale: l })} aria-current={one === l ? 'page' : undefined} className={chip(one === l)}>
            <span lang={l}>{LOCALE_NAMES[l]}</span> <span className="text-subtle tabular-nums">{count(state, l).toLocaleString('en-US')}</span>
          </Link>
        ))}
      </div>

      {pins.length === 0 ? (
        <p className="text-subtle">Nothing {STATE_LABELS[state].toLowerCase()} here.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {pins.map((pin) => (
            <li key={pin.pinId} className="py-3">
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                <Link href={`/pin/${pin.pinId}`} className="font-medium">
                  #{pin.pinId} {pin.title}
                </Link>
                <span className="text-xs text-subtle">edited {when.format(new Date(pin.editedAt))}</span>
              </div>
              <ul className="space-y-0.5 text-xs text-subtle">
                {pin.locales.map((row) => (
                  <li key={row.locale}>
                    <Link href={`/${row.locale}/pin/${pin.pinId}`} lang={row.locale} className="font-medium">
                      {LOCALE_NAMES[row.locale]}
                    </Link>
                    {row.translatedAt ? ` translated ${when.format(new Date(row.translatedAt))}` : ' never translated'}
                    {row.state === 'outdated'
                      ? row.changed
                        ? row.changed.length
                          ? ` · since edited: ${row.changed.map((f) => FIELD_LABELS[f]).join(', ')}`
                          : ''
                        : ' · edited fields not known (translated before they were recorded)'
                      : null}
                    {row.state === 'incomplete' ? ' · a field is missing or cut short' : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-subtle">
        {total > pins.length ? `Showing the ${pins.length} most recently edited of ${total.toLocaleString('en-US')} pins. ` : null}
        To make them again: <code>npm run translations:sync -- --locale {one ?? locales.join(',')}</code> with the API key, or by hand
        through <code>/api/admin/translations?locale={one ?? locales.join(',')}</code>, which lists each outdated pin&apos;s edited
        fields - send just those and the rest of the stored translation is kept.
      </p>
    </div>
  );
}
