'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import type { MessageKey } from '@/lib/i18n/translate';
import type { ResortActivity } from '@/lib/travel';

export function TopActivitiesPane({
  activities,
  className = '',
}: {
  activities?: ResortActivity[];
  className?: string;
}) {
  const t = useT();
  const gt = (key: string, values?: Record<string, string | number>) => t(`guides.travel.${key}` as MessageKey, values);
  const [activeIdx, setActiveIdx] = useState(0);
  const [expandedAll, setExpandedAll] = useState(false);

  if (!activities || activities.length === 0) return null;

  const current = activities[activeIdx] ?? activities[0];

  return (
    <div className={`rounded-md border border-[var(--rule)] bg-[var(--paper)] p-3 text-xs ${className}`}>
      {/* Header bar with icon and category switcher */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[var(--rule)] pb-2 text-[10px]">
        <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[var(--soft)]">
          <Icon name="compass" className="size-3.5 text-[var(--green)]" />
          <span>{gt('topActivities')}</span>
          <span className="font-normal text-[var(--soft)]">({activities.length})</span>
        </div>

        {/* Category Pill Switcher */}
        {!expandedAll && activities.length > 1 && (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label={gt('signatureCategories')}>
            {activities.map((act, idx) => {
              const isSelected = idx === activeIdx;
              return (
                <button
                  key={`${act.category}-${act.title}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveIdx(idx)}
                  className={`cursor-pointer rounded-xs px-2 py-0.5 text-[9px] font-semibold transition-colors ${
                    isSelected
                      ? 'bg-[var(--green)] text-[#fffef0] shadow-xs'
                      : 'bg-[var(--paper-raised)] text-[var(--text)] border border-[var(--rule)] hover:bg-[var(--rule)]'
                  }`}
                >
                  {act.category === 'Kids' ? `🧒 ${gt('cat.Kids')}` : t.has(`guides.travel.cat.${act.category}`) ? gt(`cat.${act.category}`) : act.category}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pane Content: Single Active Activity vs All Expanded */}
      {expandedAll ? (
        <div className="mt-2.5 space-y-2.5">
          {activities.map((act, idx) => (
            <div key={act.title} className={idx > 0 ? 'border-t border-[var(--rule)] pt-2' : ''}>
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <span className="inline-flex items-center gap-1">
                  <span className="text-[10px] font-bold text-[var(--soft)]">{idx + 1}.</span>
                  <strong className="text-[11px] font-semibold text-[var(--text)]">{act.title}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  {(act.kidsFriendly || act.category === 'Kids') && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#e8f5e9] px-1.5 py-0.5 text-[9px] font-semibold text-[#1b5e20] ring-1 ring-[#c8e6c9]">
                      <Icon name="smile" className="size-2.5 text-[#2e7d32]" />
                      <span>{gt('kidsFriendly')}</span>
                    </span>
                  )}
                  {act.season && (
                    <span className="rounded bg-[#edf0cf] px-1.5 py-0.5 text-[9px] font-semibold text-[#244d39]">
                      {act.season}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--soft)]">
                {act.description}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <h4 className="text-[11px] font-bold text-[var(--text)]">
              {current.title}
            </h4>
            <div className="flex items-center gap-1.5">
              {(current.kidsFriendly || current.category === 'Kids') && (
                <span className="inline-flex items-center gap-1 rounded bg-[#e8f5e9] px-1.5 py-0.5 text-[9px] font-semibold text-[#1b5e20] ring-1 ring-[#c8e6c9]">
                  <Icon name="smile" className="size-2.5 text-[#2e7d32]" />
                  <span>{gt('kidsFriendly')}</span>
                </span>
              )}
              {current.season && (
                <span className="rounded bg-[#edf0cf] px-1.5 py-0.5 text-[9px] font-semibold text-[#244d39]">
                  {current.season}
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--soft)]">
            {current.description}
          </p>
        </div>
      )}

      {/* Footer bar with category highlight and view all toggle */}
      {activities.length > 1 && (
        <div className="mt-2 flex items-center justify-between border-t border-[var(--rule)] pt-1.5 text-[10px]">
          <span className="text-[10px] text-[var(--soft)]">
            {expandedAll
              ? gt('showingAll', { count: activities.length })
              : gt('experienceOf', { category: t.has(`guides.travel.cat.${current.category}`) ? gt(`cat.${current.category}`) : current.category })}
          </span>
          <button
            type="button"
            onClick={() => setExpandedAll(!expandedAll)}
            className="inline-flex items-center gap-1 font-semibold text-[var(--green)] hover:underline cursor-pointer"
            aria-expanded={expandedAll}
          >
            <span>{expandedAll ? gt('showLess') : gt('viewAll', { count: activities.length })}</span>
            <Icon name="chevron" className={`size-2.5 transition-transform ${expandedAll ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}

