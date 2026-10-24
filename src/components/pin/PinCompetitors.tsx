import Link from '@/components/ui/Link';
import { PinThumb } from '@/components/pin/PinThumb';
import type { PinCompetitorJson } from '@/lib/competitors';
import type { Translator } from '@/lib/i18n/translate';
import { localizePath } from '@/lib/i18n/config';
import { pinPath } from '@/lib/seo';

// The main rival products (PinCompetitor, 0211): a row each with its maker and
// the figures worth comparing, linking to the rival's own pin when it has one.
export function PinCompetitors({ competitors, t }: { competitors: PinCompetitorJson[]; t: Translator }) {
  if (!competitors.length) return null;
  return (
    <section aria-labelledby="competitors-heading" className="mb-5">
      <h2 id="competitors-heading" className="mb-3 text-[11px] font-semibold tracking-wider text-subtle uppercase">
        {t('pin.competitorsHeading')}
      </h2>
      <ul className="surface flex flex-col gap-3 rounded-lg p-3">
        {competitors.map((c) => {
          const href = c.pin ? localizePath(pinPath(c.pin), t.locale) : null;
          return (
            <li key={c.rank} className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 text-sm">
              {href ? (
                <Link href={href} tabIndex={-1} aria-hidden>
                  <PinThumb thumbName={c.pin!.thumbName} originalUrl={c.pin!.originalUrl} title={c.name} className="h-11 w-16" />
                </Link>
              ) : (
                <PinThumb title={c.name} className="h-11 w-16" />
              )}
              <div className="min-w-0">
                <div className="leading-snug">
                  {href ? (
                    <Link href={href} className="font-medium text-link hover:underline">
                      {c.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">{c.name}</span>
                  )}
                  {c.maker ? <span className="text-subtle"> · {c.maker}</span> : null}
                </div>
                {c.summary ? <p className="mt-0.5 text-xs text-muted">{c.summary}</p> : null}
                {c.sourceUrl ? (
                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-subtle hover:underline">
                    {t('pin.competitorSource')}
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
