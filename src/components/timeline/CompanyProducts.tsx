'use client';

import { useId, useMemo, useState } from 'react';
import { PinThumb } from '@/components/pin/PinThumb';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { averageByPeriod, bucketUnit, majorProducts, type CompanySentiment, type ProductSentiment } from '@/lib/companySentiment';
import { CompanySentimentChart } from './CompanySentiment';

// The products listed before "Show more".
const SHOWN = 5;
// The sparkline's size, and the room it keeps so a dot on -1 or 1 is whole.
const SPARK_W = 104;
const SPARK_H = 22;
const SPARK_PAD = 2.5;

const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

// A company's major products, each as a row: a picture from its newest pin
// that has one (a blank tile keeps the rows lined up), its name, how many pins
// it has, a sparkline of how they read as news and their average. The sparklines share
// one time axis - the company's whole span - so rows compare at a glance.
// Picking a row opens that product's own graph (CompanySentimentChart), with
// hover, the Today line and a table for screen readers. Nothing until at
// least one of the company's pins has a product (src/lib/companySentiment.ts).
export function CompanyProductsPanel({ name, sentiment }: { name: string; sentiment: CompanySentiment }) {
  const t = useT();
  const products = useMemo(() => majorProducts(sentiment), [sentiment]);
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const listId = useId();

  // The span every sparkline is drawn over, never narrower than a month, and
  // the period its average line takes, both from the company's pins.
  const axis = useMemo(() => {
    const points = sentiment.pins.map((p) => ({ at: Date.parse(p.at), value: p.value }));
    const times = points.map((p) => p.at);
    let from = Math.min(...times);
    let to = Math.max(...times);
    const minSpan = 31 * 86400000;
    if (to - from < minSpan) {
      const mid = (from + to) / 2;
      from = mid - minSpan / 2;
      to = mid + minSpan / 2;
    }
    return { from, to, unit: bucketUnit(points) };
  }, [sentiment.pins]);

  if (!products.length) return null;
  const shown = all ? products : products.slice(0, SHOWN);

  return (
    <section aria-labelledby={`${listId}-h`} className="floating flex flex-col gap-2 px-4 py-3.5">
      <h2 id={`${listId}-h`} className="flex items-center gap-1 text-sm font-semibold text-ink">
        {t('company.products')}
        {/* What the rows mean, folded out under the heading as the graph's is. */}
        <button
          type="button"
          onClick={() => setExplaining(!explaining)}
          aria-expanded={explaining}
          aria-controls={`${listId}-about`}
          aria-label={t('company.productsAboutLabel')}
          title={t('company.productsAboutLabel')}
          className={`-my-1 rounded-full p-1 font-normal hover:bg-raised hover:text-ink ${explaining ? 'text-link' : 'text-subtle'}`}
        >
          <Icon name="info" className="size-3.5" />
        </button>
      </h2>
      {explaining ? (
        <p id={`${listId}-about`} className="rounded-lg border border-line bg-raised/40 px-3 py-2.5 text-xs leading-relaxed text-muted">
          {t('company.productsAbout', { name })}
        </p>
      ) : null}
      <ul id={listId} className="-mx-2 flex flex-col">
        {shown.map((product) => {
          const key = product.name.toLowerCase();
          const expanded = open === key;
          return (
            <li key={key} className="flex flex-col">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : key)}
                aria-expanded={expanded}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-raised ${expanded ? 'bg-raised/60' : ''}`}
              >
                <PinThumb thumbName={product.picture?.thumbName} originalUrl={product.picture?.originalUrl} className="h-9 w-12" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* The name and its average on one line, then the pin count
                      and the sparkline under them. */}
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{product.name}</span>
                    <span className="shrink-0 text-xs font-medium text-ink tabular-nums" title={t('company.productAverage', { value: signed(product.average) })}>
                      {signed(product.average)}
                    </span>
                    <Icon name="chevron" className={`size-3.5 shrink-0 text-subtle transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-subtle">{t('company.productPins', { count: product.sentiment.pins.length })}</span>
                    <Sparkline product={product} axis={axis} />
                  </span>
                </span>
              </button>
              {expanded ? (
                <div className="px-2 pt-1 pb-2.5">
                  <CompanySentimentChart name={product.name} sentiment={product.sentiment} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {products.length > SHOWN ? (
        <button type="button" onClick={() => setAll(!all)} aria-controls={listId} className="self-start text-xs font-medium text-link hover:underline">
          {all ? t('company.productsFewer') : t('company.productsMore', { count: products.length - SHOWN })}
        </button>
      ) : null}
    </section>
  );
}

// One product's pins as a small line: a faint dot per pin and the average per
// period through them, over the neutral line, on the company's time axis. The
// row's text says the same (count and average), so it is hidden from screen
// readers; the opened graph has the table.
function Sparkline({ product, axis }: { product: ProductSentiment; axis: { from: number; to: number; unit: 'month' | 'year' } }) {
  const points = product.sentiment.pins.map((p) => ({ at: Date.parse(p.at), value: p.value }));
  const buckets = averageByPeriod(points, axis.unit);
  const x = (at: number) => SPARK_PAD + ((at - axis.from) / (axis.to - axis.from)) * (SPARK_W - 2 * SPARK_PAD);
  const y = (value: number) => SPARK_PAD + ((1 - value) / 2) * (SPARK_H - 2 * SPARK_PAD);
  const path = buckets.map((b, i) => `${i ? 'L' : 'M'}${x(b.at).toFixed(1)},${y(b.value).toFixed(1)}`).join('');
  return (
    <svg aria-hidden width={SPARK_W} height={SPARK_H} className="shrink-0 overflow-visible">
      <line x1={0} x2={SPARK_W} y1={y(0)} y2={y(0)} className="stroke-line" strokeWidth={1} />
      {points.map((p, i) => (
        <circle key={i} cx={x(p.at)} cy={y(p.value)} r={buckets.length > 1 ? 1.75 : 2.5} className="fill-tone-news" fillOpacity={buckets.length > 1 ? 0.4 : 0.9} />
      ))}
      {buckets.length > 1 ? <path d={path} fill="none" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" className="stroke-tone-news" /> : null}
    </svg>
  );
}
