import type { Translator } from '@/lib/i18n/translate';
import { FACTORY_AXES, FACTORY_KEYS, factoryScores, hasFactoryRubric, type PinFactoryJson } from '@/lib/pinFactory';
import { TasteRadar } from './TasteRadar';
import { FactorySource } from './FactorySource';

export function PinFactory({ factory, t, className = '' }: { factory: PinFactoryJson; t: Translator; className?: string }) {
  if (!hasFactoryRubric(factory)) return null;
  const labels = Object.fromEntries(FACTORY_KEYS.map(k => [k, t(`pin.factory.${k}`)]));
  const scores = factoryScores(factory);
  const summary = FACTORY_KEYS.map(k => `${labels[k]}: ${scores[k] === null ? t('pin.factory.na') : `${scores[k]}/5`} (${t(`pin.factory.${factory.axes[k].basis}`)})`).join(', ');
  return <section className={`text-sm ${className}`} aria-label={t('pin.factory.heading')}>
    <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t('pin.factory.heading')}</h2>
    <div className="surface rounded-lg px-3 py-2">
      <p className="font-medium">{t(`pin.factory.${factory.status}`)}</p>
      <p className="mt-1 text-xs text-muted">{t('pin.factory.assessed', { date: factory.assessmentDate, year: String(factory.rubricYear), sector: factory.sector })}</p>
      <TasteRadar scores={scores} labels={labels} summary={summary} showJa={false} axes={FACTORY_AXES} linkLabels={false} height={330} max={5} naLabel={t('pin.factory.na')} />
      <p className="mt-2 text-xs text-muted">{t('pin.factory.note')}</p>
      {/* Keep every score and its basis visible even without hovering the chart. */}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {FACTORY_KEYS.map(k => <div key={k}><dt className="text-muted">{labels[k]}</dt><dd className="font-medium">{scores[k] === null ? t('pin.factory.na') : `${scores[k]}/5`} · {t(`pin.factory.${factory.axes[k].basis}`)}</dd></div>)}
      </dl>
      <details className="mt-3"><summary className="cursor-pointer text-xs font-medium">{t('pin.factory.evidence')}</summary><dl className="space-y-4 py-2">{FACTORY_KEYS.map(k => <div key={k}><dt className="text-xs font-medium">{labels[k]} · {t(`pin.factory.${factory.axes[k].basis}`)}</dt><dd className="mt-1 text-xs">{factory.axes[k].reasoning}{factory.axes[k].benchmark ? <p className="mt-1">{factory.axes[k].benchmark.description}</p> : null}{[...factory.axes[k].sources, ...(factory.axes[k].benchmark?.sources ?? [])].map((s, i) => <FactorySource key={i} source={s} />)}</dd></div>)}</dl></details>
    </div>
  </section>;
}
