import '../scripts/env';
import * as db from '@/server/db';
import { writeFileSync } from 'node:fs';
const fiat = [
  { url: 'https://www.autoexpress.co.uk/fiat/500/368421/new-fiat-500-hybrid-2026-review-perfect-ev-alternative-if-it-was-bit-quicker', title: 'New Fiat 500 Hybrid 2026 review: the perfect EV alternative, if it was a bit quicker', publishedDate: '2025-11-27', quote: 'The 500 Hybrid is perfectly capable from a handling perspective, but the first-car feeling soon wears thin', sentiment: 0.15 },
];
const renault = [
  { url: 'https://www.goauto.com.au/amp/renault/symbioz/2026-renault-symbioz-review/2026-08-20/100121.html', title: '2026 Renault Symbioz Review', publishedDate: '2026-08-20', quote: 'Its steering is light but direct, suitable for around-town-manoeuvring.', sentiment: 0.55 },
  { url: 'https://www.carexpert.com.au/car-reviews/2026-renault-symbioz-review-quick-drive', title: '2026 Renault Symbioz review: Quick drive', publishedDate: '2026-08-20', quote: "It can actually be a bit of a buzz-box at higher RPM, and it's fair to want more performance when you lay into the throttle – it's achingly slow.", sentiment: -0.3 },
  { url: 'https://www.carsguide.com.au/urban/renault-symbioz-techno-mild-hybrid-102708', title: 'Renault Symbioz 2026 review: Techno mild hybrid | Nissan Qashqai rival tested', publishedDate: '2026-09-25', quote: 'Finally, the way the Symbioz drives is so engaging.', sentiment: 0.7 },
];
const entries = [];
for (const [pinId, reviews] of [[15253, fiat], [15256, renault]] as const) {
  const [pin] = await db.query(`SELECT "sourceUrl" FROM "Pin" WHERE "id" = $1`, [pinId]);
  entries.push({ table: 'PinGasCarPerf', pinId, pinSourceUrl: pin.sourceUrl, basis: 'Independent road tests opened 2026-10-26. Fiat: new 2026 1.0-litre 500 Hybrid, not 500e or earlier 500. Renault: Australian 1.3-litre Techno Mild Hybrid, not Full Hybrid; CarExpert extract comes specifically from the mild-hybrid driving section. Explicit byline publication dates and short verbatim driving extracts verified. Axes preserved.', reviews,
    evidence: reviews.map((review) => ({ url: review.url, openedAt: '2026-10-26', title: review.title, publishedDate: review.publishedDate, quoteVerified: true, method: 'Opened publisher page; exact-model road-test section and publication byline' })) });
}
writeFileSync('scripts/products/gas-review-research-2026-10-26.json', JSON.stringify({ checkedAt: '2026-10-26', entries }, null, 2) + '\n');
await db.closeConnection();
