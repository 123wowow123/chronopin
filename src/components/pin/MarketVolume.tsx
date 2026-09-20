'use client';

import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { useMarketOdds } from '@/lib/client/marketOdds';
import { totalMarketVolume } from '@/lib/predictionMarkets';
import { compactUsd } from '@/lib/format';
import type { PinJson } from '@/lib/types';

// How much money is on the markets a pin cites, as one pill beside the pin's
// other facts: "$3.9M traded". The stored figure (Pin.marketVolume, schema
// 0053) draws it on the server, so the page has it before any odds arrive and
// still has it when an exchange is down; once the page's odds do arrive it
// shows their sum instead, which is the same figure a moment fresher.
//
// Nothing renders for a pin with no market links, or one whose exchanges
// report no volume (Polymarket US publishes none).

type VolumePin = Pick<PinJson, 'id' | 'marketVolume'>;

export function MarketVolume({ pin, className = '' }: { pin: VolumePin; className?: string }) {
  const t = useT();
  const markets = useMarketOdds(pin.id);
  const live = markets?.length ? totalMarketVolume(markets) : 0;
  const volume = live || Number(pin.marketVolume) || 0;
  if (!(volume > 0)) return null;

  return (
    <span className={`surface inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${className}`} title={t('odds.tradedTitle')}>
      <Icon name="trending-up" className="size-3.5 text-subtle" />
      <span className="font-semibold text-ink tabular-nums">{t('odds.traded', { amount: compactUsd(t.locale).format(volume) })}</span>
    </span>
  );
}
