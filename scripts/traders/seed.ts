// Seeds the premium trader positions (0223) read by hand from the followed
// traders' posts: our own one-line summaries with a link to the post, never the
// author's text. Quiet (no push). Usage: npm run traders:seed
import '../env';
import * as db from '@/server/db';
import { addPosition } from '@/server/services/traders';
import type { Instrument, TraderAction } from '@/lib/traders';

const BURRY = { traderSlug: 'michael-burry', traderName: 'Michael Burry' };
const TP = {
  sourceUrl: 'https://michaeljburry.substack.com/p/trading-post-october-5-2026',
  sourceTitle: 'Trading Post October 5, 2026',
  tradeDate: '2026-10-05',
};
const rows: [string, Instrument, TraderAction, string][] = [
  ['LULU', 'stock', 'sell', 'Sold lululemon to book a tax loss, planning to buy it back after the 30-day wash-sale window.'],
  ['DECK', 'stock', 'buy', 'Swapped lululemon into Deckers as a similar-looking proxy while the wash-sale window runs.'],
  ['FNMA', 'stock', 'sell', 'Sold all Fannie Mae into Freddie Mac for a tax loss; plans to swap back next month.'],
  ['FMCC', 'stock', 'buy', 'Moved the Fannie Mae exposure into Freddie Mac, keeping a bet on the senior preferred decision.'],
  ['FISV', 'stock', 'hold', 'Holding Fiserv through the tax-loss season; no good proxy and the price is cheap enough.'],
  ['SFM', 'call', 'buy', 'Replaced Sprouts shares with far-dated, far out-of-the-money 2028-29 calls for leveraged upside.'],
  ['ZTS', 'call', 'buy', 'Replaced Zoetis shares with far-dated, far out-of-the-money 2028-29 calls.'],
  ['MET', 'put', 'buy', 'Bought more far out-of-the-money 2029 MetLife puts, a hedge on private-credit marks.'],
  ['JD', 'call', 'buy', 'Bought more far out-of-the-money 2029 JD.com calls on Hong Kong-listed value.'],
  ['BYDFF', 'stock', 'buy', 'Bought BYD common in decent size as it fell back to a level he had waited for.'],
];

// HFIR's trade alerts (paid, hfir.com) state entry prices; USD-listed ones are used as the entry.
const HFIR = { traderSlug: 'hfi-research', traderName: 'HFI Research' };
const hfir = (slug: string, title: string, tradeDate: string) => ({ ...HFIR, sourceUrl: `https://www.hfir.com/p/${slug}`, sourceTitle: title, tradeDate });
type Row = [string, Instrument, TraderAction, string, number?];
const hfirRows: [ReturnType<typeof hfir>, Row[]][] = [
  [hfir('trade-alert-long-rig', 'Trade Alert - Long RIG', '2026-10-22'), [['RIG', 'stock', 'buy', 'Opened a roughly $570k long in Transocean at about $6.05 a share.', 6.05]]],
  [hfir('trade-alert-buying-parex-geopark', 'Trade Alert - Buying Parex, Geopark, And NSE (Colombian oil producer trade)', '2026-07-06'), [
    ['PXT.TO', 'stock', 'buy', 'Bought about $200k of Parex Resources (Toronto) as part of a Colombian oil-producer trade.'],
    ['GPRK', 'stock', 'buy', 'Bought about $200k of GeoPark in the same Colombia trade, at about $9.28.', 9.28],
    ['NSE.V', 'stock', 'buy', 'Added about $50k of NSE (TSX Venture) to the Colombia trade.'],
  ]],
  [hfir('trade-alert-buying-nsev', 'Trade Alert - Buying NSE.V', '2026-07-02'), [['NSE.V', 'stock', 'buy', 'Bought 125,000 NSE shares: the only listed pure play on Venezuelan oil optionality plus a possible Colombia deal.']]],
  [hfir('trade-alert-buying-su-and-mnr', 'Trade Alert - Buying SU And MNR', '2026-07-01'), [
    ['SU', 'stock', 'buy', 'Bought about $200k of Suncor at about $53.44.', 53.44],
    ['MNR', 'stock', 'buy', 'Bought about $200k of Mach Natural Resources at about $12.66.', 12.66],
  ]],
  [hfir('trade-alert-selling-bneto-and-buying', 'Trade Alert - Selling BNE.TO And Buying BNO', '2026-06-15'), [
    ['BNE.TO', 'stock', 'sell', 'Sold all Bonterra Energy in the oil trading accounts at a 12.8% loss versus the 2023 cost basis.'],
    ['BNO', 'stock', 'buy', 'Bought about $250k of the Brent oil ETF (BNO) at about $45.92 with the proceeds.', 45.92],
  ]],
  [hfir('trade-alert-long-bno-calls-afb', 'Trade Alert - Long BNO Calls', '2026-06-09'), [['BNO', 'call', 'buy', 'Bought 420 Jan 2027 $60-strike BNO calls for $6.80 each, about $285,600.']]],
  [hfir('trade-alert-long-bno-calls-276', 'Trade Alert - Long BNO Calls', '2026-05-08'), [['BNO', 'call', 'buy', 'Bought 265 Jan 2027 $70-strike BNO calls for $6.31 each, about $167,215.']]],
];

// Shrubstack ("Le Shrub", a parody trading blog): positions the posts say he took.
const SHRUB = { traderSlug: 'le-shrub', traderName: 'Le Shrub' };
const shrub = (slug: string, title: string, tradeDate: string) => ({ ...SHRUB, sourceUrl: `https://www.shrubstack.com/p/${slug}`, sourceTitle: title, tradeDate });
const shrubRows: [ReturnType<typeof shrub>, Row[]][] = [
  [shrub('the-ai-slop-of-hope-ii-trades', 'The AI Slop of Hope II - Trades', '2026-10-15'), [
    ['BLDR', 'stock', 'buy', 'Took a small (about 1% of NAV) position in Builders FirstSource, down about 60% on the year.'],
    ['BLDR', 'call', 'buy', 'Bought cheap November $60 BLDR calls alongside the shares.'],
    ['QURE', 'call', 'buy', 'Bought uniQure November $30 calls for about $1, a bet on the Nov 2 FDA filing decision.'],
    ['LXU', 'stock', 'buy', 'Bought 2-3% of NAV in LSB Industries, a nitrogen fertilizer name at about 4.7x EBITDA.'],
    ['WOLF', 'stock', 'buy', 'Took a small (about 1% of NAV) position in Wolfspeed after its post-bankruptcy slide.'],
  ]],
  [shrub('its-a-marathon-and-a-sprint', "It's a Marathon and a Sprint", '2026-10-25'), [
    ['WY', 'call', 'buy', 'Prefers Weyerhaeuser January 2027 $20 calls to the stock: timberland value and a housing-recovery option, results Oct 29.'],
    ['CCXI', 'stock', 'sell', 'Cutting the Agility Robotics SPAC position to about 1% of NAV before the loss of the SPAC redemption put.'],
    ['SNAP', 'call', 'hold', 'Holding Snap December $6 calls into the November 4 earnings.'],
  ]],
];

(async () => {
  let added = 0;
  for (const [ticker, instrument, action, summary] of rows) {
    if (await addPosition({ ...BURRY, ...TP, ticker, instrument, action, summary }, { push: false })) added++;
  }
  for (const [meta, list] of [...hfirRows, ...shrubRows] as [Record<string, string>, Row[]][]) {
    for (const [ticker, instrument, action, summary, entryPrice] of list) {
      const base = { ...meta } as Parameters<typeof addPosition>[0];
      if (await addPosition({ ...base, ticker, instrument, action, summary }, { push: false, entryPrice: entryPrice ?? undefined })) added++;
    }
  }
  console.log(`added ${added}`);
  await db.closeConnection();
})();
