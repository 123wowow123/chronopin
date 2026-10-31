import type { Translator } from '@/lib/i18n/translate';
import { factoryBuildoutMetrics, hasFactoryBuildout, type FactoryBreakdownLine, type PinFactoryJson } from '@/lib/pinFactory';
import { FactorySource } from './FactorySource';

const STAGES = ['announced', 'construction', 'commissioning', 'production'] as const;

const BASIS_STYLE = {
  planned: 'border border-dashed border-muted text-muted',
  demonstrated: 'bg-link text-raised',
} as const;

function BasisBadge({ basis, label }: { basis: 'planned' | 'demonstrated'; label: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${BASIS_STYLE[basis]}`}>{label}</span>;
}

const LINE_BADGE = {
  sourced: 'bg-link text-raised',
  assumption: 'border border-dashed border-muted text-muted',
  result: 'bg-success text-raised',
} as const;

// The working behind an estimated figure: every input is tagged as sourced, an assumption, or the result.
function CostBreakdown({ lines, t }: { lines: FactoryBreakdownLine[]; t: Translator }) {
  return (
    <div className="mt-3 border-t border-raised-2 pt-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t('pin.factory.costBreakdown')}</h3>
      <ol className="mt-2 space-y-2 text-xs">
        {lines.map((line, i) => (
          <li key={i} className={`rounded-md px-3 py-2 ${line.kind === 'result' ? 'bg-raised-2' : 'bg-raised/60'}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="flex items-center gap-2">
                <span className="w-4 text-muted tabular-nums">{i + 1}</span>
                <span className="font-semibold">{line.label}</span>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${LINE_BADGE[line.kind]}`}>
                  {t(`pin.factory.breakdown${line.kind === 'sourced' ? 'Sourced' : line.kind === 'assumption' ? 'Assumption' : 'Result'}`)}
                </span>
              </span>
              <span className="font-medium tabular-nums">{line.value}</span>
            </div>
            {line.note ? <p className="mt-1 ps-6 text-muted">{line.note}</p> : null}
            {line.source ? (
              <details className="mt-1 ps-6">
                <summary className="cursor-pointer text-link">{t('pin.factory.source')}</summary>
                <FactorySource source={line.source} />
              </details>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PinFactoryBuildout({ factory, t, className = '' }: { factory: PinFactoryJson; t: Translator; className?: string }) {
  if (!hasFactoryBuildout(factory)) return null;
  const metrics = factoryBuildoutMetrics(factory);
  const reached = STAGES.indexOf(factory.status as (typeof STAGES)[number]);
  return (
    <section className={`text-sm ${className}`} aria-label={t('pin.factory.buildoutHeading')}>
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t('pin.factory.buildoutHeading')}</h2>
      <div className="surface rounded-xl px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-base font-semibold">{t(`pin.factory.${factory.status}`)}</p>
          <p className="text-xs text-muted">{factory.sector} · {t('pin.factory.checked', { date: factory.assessmentDate })}</p>
        </div>
        {/* Highlight only the reported stage; earlier stages are not asserted as independently verified. */}
        <ol className="mt-4 grid grid-cols-4 text-center text-[11px] leading-tight" aria-label={t('pin.factory.metric.stage')}>
          {STAGES.map((stage, i) => {
            const current = factory.status === stage;
            return (
              <li key={stage} aria-current={current ? 'step' : undefined} className="relative flex flex-col items-center gap-1.5 px-0.5">
                {i > 0 ? <span aria-hidden className="absolute start-[-50%] top-[7px] h-0.5 w-full bg-raised-2" /> : null}
                <span aria-hidden className={`relative z-10 size-4 rounded-full border-2 ${current ? 'border-link bg-link ring-4 ring-raised-2' : 'border-raised-2 bg-raised'}`} />
                <span className={current ? 'font-semibold text-link' : i < reached ? 'text-muted' : 'text-muted opacity-70'}>{t(`pin.factory.${stage}`)}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px] text-muted">{t('pin.factory.buildoutNote')}</p>
        <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {metrics.map(metric => (
            <div key={metric.key} className={`min-w-0 rounded-lg bg-raised-2/40 p-3 ${metric.breakdown?.length ? 'sm:col-span-2' : ''}`}>
              <dt className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                <span>{t(`pin.factory.metric.${metric.key}`)}</span>
                <BasisBadge basis={metric.basis} label={t(`pin.factory.${metric.basis}`)} />
              </dt>
              <dd className="mt-1.5 break-words">
                <p className="font-medium leading-snug">{metric.value}</p>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-link">{t('pin.factory.source')}</summary>
                  <FactorySource source={metric.source} />
                </details>
                {metric.breakdown?.length ? <CostBreakdown lines={metric.breakdown} t={t} /> : null}
              </dd>
            </div>
          ))}
        </dl>
        {factory.milestones?.length ? (
          <div className="mt-5">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{t('pin.factory.projectTimeline')}</h3>
            <ol className="mt-3 ms-1.5 border-s-2 border-raised-2">
              {factory.milestones.map((milestone, i) => (
                <li key={i} className="relative pb-4 ps-5 text-xs last:pb-0">
                  <span aria-hidden className={`absolute -start-[7px] top-0.5 size-3 rounded-full border-2 border-link ${milestone.basis === 'demonstrated' ? 'bg-link' : 'bg-raised'}`} />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold tabular-nums">{milestone.date}</span>
                    <BasisBadge basis={milestone.basis} label={t(`pin.factory.${milestone.basis}`)} />
                  </div>
                  <p className="mt-0.5 text-sm">{milestone.label}</p>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-link">{t('pin.factory.source')}</summary>
                    <FactorySource source={milestone.source} />
                  </details>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
