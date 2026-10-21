import { SITE_KINDS, SITE_STYLE, type PinSiteShapeJson } from '@/lib/siteShape';
import type { Translator } from '@/lib/i18n/translate';
import Anchor from '@/components/ui/Anchor';

// The key under a data centre's map: a swatch and name for each kind of outline
// drawn on it, how many of each, and who traced them.
export function SiteShapeKey({ shape, t }: { shape: PinSiteShapeJson; t: Translator }) {
  const counts = new Map<string, number>();
  for (const f of shape.geojson.features) counts.set(f.properties.kind, (counts.get(f.properties.kind) ?? 0) + 1);
  return (
    <div className="mt-2 text-xs text-muted">
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {SITE_KINDS.filter((kind) => counts.has(kind)).map((kind) => (
          <li key={kind} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-3 rounded-sm border"
              style={{ borderColor: SITE_STYLE[kind].color, backgroundColor: `${SITE_STYLE[kind].color}${kind === 'site' ? '22' : '88'}` }}
            />
            {t(`pin.siteKey.${kind}`)}
            {kind === 'site' ? null : <span className="tabular-nums">({counts.get(kind)})</span>}
          </li>
        ))}
      </ul>
      <p className="mt-1">
        {t('pin.siteKey.caption')}{' '}
        {shape.sourceUrl ? (
          <Anchor href={shape.sourceUrl} target="_blank" rel="noopener noreferrer">
            {shape.source}
          </Anchor>
        ) : (
          shape.source
        )}
      </p>
    </div>
  );
}
