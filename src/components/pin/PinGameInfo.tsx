import { PLATFORMS, type PinGameInfoJson } from '@/lib/gameInfo';
import type { Translator } from '@/lib/i18n/translate';
import { PlatformLogo } from './PlatformLogo';
import { RefineLink } from './RefineLink';

// A game pin's maturity rating (with the board's content descriptors) and the
// platforms it ships on, each with its official logo (PinGameInfo, 0124).
export function PinGameInfo({ info, t, className = '' }: { info: PinGameInfoJson; t: Translator; className?: string }) {
  const { maturityBoard, maturityRating, descriptors, platforms } = info;
  if (!maturityRating && !platforms.length) return null;
  const chip = 'surface flex items-center gap-1.5 rounded-full px-3 py-1 text-xs';
  return (
    <section className={`grid gap-3 text-sm ${className}`} aria-label={t('pin.gameInfo')}>
      {maturityRating ? (
        <div>
          <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t('pin.gameMaturity')}</h2>
          <RefineLink
            field="rated"
            value={`${maturityBoard} ${maturityRating}`}
            className="surface block rounded-lg px-3 py-2 hover:ring-1 hover:ring-inset hover:ring-line hover:no-underline"
          >
            <span className="block font-semibold text-ink">
              {maturityBoard} {maturityRating}
            </span>
            {descriptors.length ? <span className="block text-muted">{descriptors.join(' · ')}</span> : null}
          </RefineLink>
        </div>
      ) : null}
      {platforms.length ? (
        <div>
          <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t('pin.gamePlatforms')}</h2>
          <ul className="flex flex-wrap gap-2">
            {platforms.map((key) => (
              <li key={key}>
                <RefineLink field="platform" value={PLATFORMS[key].label} className={`${chip} hover:ring-1 hover:ring-inset hover:ring-line hover:no-underline`}>
                  <PlatformLogo family={PLATFORMS[key].family} />
                  <span className="text-ink">{PLATFORMS[key].label}</span>
                </RefineLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
