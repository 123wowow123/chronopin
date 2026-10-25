'use client';

import { useId } from 'react';
import { useT } from '@/lib/client/i18n';
import type { DistrictRedraw, DistrictView } from '@/lib/siteShape';

export function DistrictRedrawControls({ redraws, selected, view, onSelect, onView }: {
  redraws: DistrictRedraw[]; selected: string; view: DistrictView;
  onSelect: (id: string) => void; onView: (view: DistrictView) => void;
}) {
  const t = useT();
  const id = useId();
  const redraw = redraws.find((r) => r.id === selected);
  return (
    <fieldset className="space-y-2 rounded-xl border border-line bg-raised p-3 text-sm">
      <legend className="px-1 font-medium">{t('pin.redraw.title')}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id}>{t('pin.redraw.jurisdiction')}</label>
        <select id={id} value={redraw ? selected : ''} onChange={(event) => onSelect(event.target.value)} className="max-w-full rounded border border-line bg-paper px-2 py-1 text-ink">
          <option value="">{t('pin.redraw.allDistricts')}</option>
          {redraws.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {redraw ? <div role="group" aria-label={t('pin.redraw.title')} className="inline-flex flex-wrap gap-1">
          {(['before', 'after', 'compare'] as const).map((mode) => (
            <button key={mode} type="button" aria-pressed={view === mode} onClick={() => onView(mode)}
              className={`rounded border px-2 py-1 ${view === mode ? 'border-accent bg-accent/10 font-medium text-ink' : 'border-line text-muted'}`}>
              {t(`pin.redraw.${mode}`)}
            </button>
          ))}
        </div> : null}
      </div>
      {redraw ? <ul className="space-y-1 text-xs text-muted">
        {(['before', 'after'] as const).map((version) => {
          const plan = redraw[version];
          return <li key={version} className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 inline-block h-3 w-5 shrink-0 border-2" style={{ borderColor: version === 'before' ? '#b45309' : '#0f766e', borderStyle: version === 'before' ? 'dashed' : 'solid' }} />
            <span><strong className="text-ink">{plan.label}</strong> · {t(`pin.redraw.status.${plan.status}`)} · {plan.vintage} ·{' '}
              <a className="underline" href={plan.sourceUrl} target="_blank" rel="noopener noreferrer">{plan.source}</a>
            </span>
          </li>;
        })}
      </ul> : null}
    </fieldset>
  );
}
