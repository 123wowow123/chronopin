import Anchor from '@/components/ui/Anchor';
import { orderEvidence, urlKey } from '@/lib/citations';
import type { Translator } from '@/lib/i18n/translate';
import type { Evidence } from '@/lib/referenceConfidence';
import { TASTE_AXES, TASTE_MAX, hasTaste, type PinTasteJson, type TasteAxis } from '@/lib/pinTaste';
import { INTL_LOCALES, type Locale } from '@/lib/i18n/config';
import { TasteRadar } from './TasteRadar';

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// The citation after the basis: [n] linking to that row of the pin's
// References panel when the page the estimate was read from is one of them,
// else the page itself, named by its host.
function Cite({ url, evidence, t }: { url: string; evidence: Evidence[]; t: Translator }) {
  const key = urlKey(url);
  const n = key ? orderEvidence(evidence).findIndex((e) => urlKey(e.url) === key) + 1 : 0;
  if (n) {
    return (
      <sup className="ms-px not-italic [&_a]:relative [&_a]:after:absolute [&_a]:after:-inset-y-2 [&_a]:after:inset-x-0 [&_a]:after:content-['']">
        <Anchor href={`#ref-${n}`} aria-label={t('references.referenceN', { n })} className="font-medium">
          [{n}]
        </Anchor>
      </sup>
    );
  }
  const host = hostOf(url);
  return (
    <>
      {' '}
      <Anchor href={url} className="font-medium">
        {host}
      </Anchor>
    </>
  );
}

// A consumable pin's taste profile as a radar (PinTaste, 0157, 0160). The
// scores are an editorial estimate and the section says so; the basis line
// says what each was read from, with the citation of the page it came from.
export function PinTaste({
  taste,
  t,
  locale,
  evidence,
  className = '',
}: {
  taste: PinTasteJson;
  t: Translator;
  locale: string;
  evidence: Evidence[];
  className?: string;
}) {
  if (!hasTaste(taste)) return null;
  const labels = Object.fromEntries(TASTE_AXES.map((axis) => [axis.key, t(`pin.taste.${axis.key}` as 'pin.taste.aroma')])) as Record<TasteAxis, string>;
  // The percent as the viewer's language writes it ("10.25%", "10,25 %").
  const abv =
    taste.abv != null
      ? {
          label: t('pin.taste.abv'),
          // Cited like the note: its own page when the pin's source is not the one stating it.
          cite: taste.abvSourceUrl ? <Cite url={taste.abvSourceUrl} evidence={evidence} t={t} /> : taste.sourceUrl ? <Cite url={taste.sourceUrl} evidence={evidence} t={t} /> : null,
          value: new Intl.NumberFormat(INTL_LOCALES[locale as Locale] ?? 'en', { style: 'percent', maximumFractionDigits: 2 }).format(taste.abv / 100),
        }
      : null;
  const summary = TASTE_AXES.map((axis) => `${labels[axis.key]} ${taste[axis.key]}/${TASTE_MAX}`).join(', ');
  return (
    <section className={`text-sm ${className}`} aria-label={t('pin.taste.heading')}>
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t('pin.taste.heading')}</h2>
      <div className="surface rounded-lg px-3 py-2">
        <TasteRadar scores={taste} labels={labels} summary={`${t('pin.taste.heading')}: ${summary}${abv ? `, ${abv.label} ${abv.value}` : ''}`} showJa={locale !== 'ja'} abv={abv} />
        <p className="text-xs text-muted">
          {t('pin.taste.note', { max: TASTE_MAX })}
          {taste.basis ? ` ${taste.basis}` : ''}
          {taste.sourceUrl ? <Cite url={taste.sourceUrl} evidence={evidence} t={t} /> : null}
        </p>
        {taste.reviews.length ? (
          <div className="mt-2 border-t border-line pt-2">
            <h3 className="mb-1 text-xs font-semibold text-muted">{t('pin.taste.reviews')}</h3>
            <ul className="grid gap-1.5 text-xs">
              {taste.reviews.map((review) => (
                <li key={review.url}>
                  <Anchor href={review.url} className="font-medium">
                    {review.title || hostOf(review.url)}
                  </Anchor>
                  <span className="text-muted">
                    {' · '}
                    {hostOf(review.url)}
                    {review.publishedDate ? ` · ${new Intl.DateTimeFormat(INTL_LOCALES[locale as Locale] ?? 'en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(review.publishedDate))}` : ''}
                  </span>
                  {review.quote ? <q className="mt-0.5 block text-muted">{review.quote}</q> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
