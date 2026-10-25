import { SITE_KINDS, SITE_STYLE, routeFacts, type PinSiteShapeJson } from '@/lib/siteShape';
import type { Translator } from '@/lib/i18n/translate';
import Anchor from '@/components/ui/Anchor';

// The key under a pin's map: a swatch and name for each kind of outline
// drawn on it, how many of each, and who traced them.
export function SiteShapeKey({ shape, t }: { shape: PinSiteShapeJson; t: Translator }) {
  const counts = new Map<string, number>();
  for (const f of shape.geojson.features) counts.set(f.properties.kind, (counts.get(f.properties.kind) ?? 0) + 1);
  const boundaries = [...new Map(shape.geojson.features
    .filter((f) => f.properties.kind === 'wildfire' || f.properties.kind === 'district')
    .map((f) => [JSON.stringify(f.properties), f.properties])).values()];
  const facts = routeFacts(shape);
  const number = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 2 });
  const profile = facts?.profile;
  const [minAlt, maxAlt] = profile?.length ? [Math.min(...profile.map((p) => p[1])), Math.max(...profile.map((p) => p[1]))] : [0, 0];
  const lastKm = profile?.length ? profile[profile.length - 1][0] : 0;
  return (
    <div className="mt-2 text-xs text-muted">
      {shape.geojson.districtRedraws?.length ? <p className="mb-1 font-medium">{t('pin.redraw.allDistricts')}</p> : null}
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {SITE_KINDS.filter((kind) => counts.has(kind)).map((kind) => (
          <li key={kind} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-3 rounded-sm border"
              style={{ borderColor: SITE_STYLE[kind].color, backgroundColor: `${SITE_STYLE[kind].color}${Math.round(SITE_STYLE[kind].fill * 255).toString(16).padStart(2, '0')}`, borderStyle: SITE_STYLE[kind].dash ? 'dashed' : 'solid' }}
            />
            {t(`pin.siteKey.${kind}`)}
            {kind === 'site' ? null : <span className="tabular-nums">({counts.get(kind)})</span>}
          </li>
        ))}
      </ul>
      {boundaries.length ? (
        <ul className="mt-1.5 space-y-1">
          {boundaries.map((boundary, i) => (
            <li key={i}>
              {boundary.name || t(`pin.siteKey.${boundary.kind}`)}
              {boundary.observedAt ? <> · <time dateTime={boundary.observedAt}>{boundary.observedAt}</time></> : null}
              {boundary.vintage ? <> · {boundary.vintage}</> : null}
              {boundary.source ? <> · {boundary.sourceUrl ? <Anchor href={boundary.sourceUrl} target="_blank" rel="noopener noreferrer">{boundary.source}</Anchor> : boundary.source}</> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {facts ? (
        <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
          {[
            [t('pin.route.length'), facts.lengthM ? `${number.format(facts.lengthM / 1000)} km` : null],
            [t('pin.route.altitude'), facts.altitudeM ? `${number.format(facts.altitudeM)} m` : null],
            [t('pin.route.opened'), facts.opened ? String(facts.opened) : null],
            [t('pin.route.firstGp'), facts.firstGp ? String(facts.firstGp) : null],
          ]
            .filter((row): row is [string, string] => !!row[1])
            .map(([label, value]) => (
              <div key={label} className="inline-flex gap-1">
                <dt>{label}</dt>
                <dd className="font-medium tabular-nums text-ink">{value}</dd>
              </div>
            ))}
        </dl>
      ) : null}
      {profile && profile.length > 1 && maxAlt > minAlt ? (
        <figure className="mt-2">
          <figcaption>
            {t('pin.route.elevation')}: <span className="tabular-nums text-ink">{number.format(minAlt)}-{number.format(maxAlt)} m</span>
          </figcaption>
          <svg viewBox="0 0 300 60" role="img" aria-label={t('pin.route.elevation')} className="mt-1 h-14 w-full" preserveAspectRatio="none">
            <polygon
              points={`0,60 ${profile.map(([km, m]) => `${((km / lastKm) * 300).toFixed(1)},${(56 - ((m - minAlt) / (maxAlt - minAlt)) * 52).toFixed(1)}`).join(' ')} 300,60`}
              fill="#e11d4833"
              stroke="#e11d48"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </figure>
      ) : null}
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
