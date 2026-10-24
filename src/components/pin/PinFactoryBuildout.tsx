import type { Translator } from '@/lib/i18n/translate';
import { factoryBuildoutMetrics, hasFactoryBuildout, type PinFactoryJson } from '@/lib/pinFactory';
import { FactorySource } from './FactorySource';

const STAGES = ['announced', 'construction', 'commissioning', 'production'] as const;

export function PinFactoryBuildout({ factory, t, className = '' }: { factory: PinFactoryJson; t: Translator; className?: string }) {
  if (!hasFactoryBuildout(factory)) return null;
  const metrics = factoryBuildoutMetrics(factory);
  return (
    <section className={`text-sm ${className}`} aria-label={t('pin.factory.buildoutHeading')}>
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t('pin.factory.buildoutHeading')}</h2>
      <div className="surface rounded-lg px-3 py-3">
        <p className="font-medium">{t(`pin.factory.${factory.status}`)}</p>
        <p className="mt-1 text-xs text-muted">{factory.sector} · {t('pin.factory.checked', { date: factory.assessmentDate })}</p>
        {/* Highlight only the reported stage; do not mark unverified earlier milestones as complete. */}
        <ol className="mt-3 grid grid-cols-2 gap-1 text-xs" aria-label={t('pin.factory.metric.stage')}>
          {STAGES.map(stage => (
            <li key={stage} aria-current={factory.status === stage ? 'step' : undefined}
              className={`rounded border px-2 py-1 ${factory.status === stage ? 'border-link bg-raised-2 font-semibold text-link' : 'border-raised-2 text-muted'}`}>
              {t(`pin.factory.${stage}`)}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted">{t('pin.factory.buildoutNote')}</p>
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {metrics.map(metric => (
            <div key={metric.key} className="min-w-0 rounded-lg border border-raised-2 p-2">
              <dt className="text-xs font-semibold text-muted">{t(`pin.factory.metric.${metric.key}`)}</dt>
              <dd className="mt-1 break-words">
                <p>{metric.value}</p>
                <p className="mt-1 text-xs text-muted">{t(`pin.factory.${metric.basis}`)}</p>
                <details className="mt-1 text-xs">
                  <summary className="cursor-pointer text-link">{t('pin.factory.source')}</summary>
                  <FactorySource source={metric.source} />
                </details>
              </dd>
            </div>
          ))}
        </dl>
        {factory.milestones?.length ? (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-muted">{t('pin.factory.projectTimeline')}</h3>
            <ol className="mt-2 space-y-3 border-s-2 border-raised-2 ps-3">
              {factory.milestones.map((milestone, i) => (
                <li key={i} className="text-xs">
                  <p className="font-semibold">{milestone.date} · {milestone.label}</p>
                  <p className="mt-1 text-muted">{t(`pin.factory.${milestone.basis}`)}</p>
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
