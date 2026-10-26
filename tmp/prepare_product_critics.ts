import '../scripts/env';
import * as db from '@/server/db';
import { writeFileSync } from 'node:fs';
const hardware = [
  { url: 'https://www.engadget.com/2019-02-25-microsoft-hololens-2-hands-on-mixed-reality.html', title: 'Microsoft HoloLens 2 hands-on: A giant leap closer to mixed reality', publishedDate: '2019-02-25', quote: 'Microsoft has made mixed reality less awkward.', sentiment: 0.65 },
  { url: 'https://www.tomsguide.com/reviews/hololens-2', title: 'Hololens 2 hands-on review: $3,500 worth of cool', publishedDate: '2019-11-11', quote: 'Out of the many AR and VR headsets I’ve tried, Hololens 2 is definitely in my top three as far as comfort goes.', sentiment: 0.75 },
  { url: 'https://www.uploadvr.com/hololens-2-review/', title: 'HoloLens 2 Review: Ahead Of Its Time, For Better And Worse', publishedDate: '2021-04-09', quote: 'For both better and worse, Microsoft’s HoloLens 2 is ahead of its time.', sentiment: 0.25 },
];
const shoes = [
  { url: 'https://www.eatthis.com/alo-runner-sneaker-review-10k-steps/', title: 'I Took ALO’s Running Sneakers for a 10K Step Spin and Here’s What Surprised Me', publishedDate: '2025-09-13', quote: 'Overall, the shoe is lightweight, breathable, comfortable, supportive, and provides the ideal amount of cushioning.', sentiment: 0.75 },
  { url: 'https://www.whowhatwear.com/wellness/alo-yoga-try-on-2026', title: 'I Tried Out Hailey Bieber and Bella Hadid’s Favourite Activewear Brand—These Are My Honest Thoughts', publishedDate: '2026-01-15', quote: 'there was no pinching, squeezing or claustrophobic toes.', sentiment: 0.65 },
  { url: 'https://www.travelandleisure.com/alo-runner-walking-shoes-review-11998731', title: 'I Comfortably Walked 50,000+ Steps on Vacation in These Breathable, Bouncy Sneakers That Elevated My Outfits', publishedDate: '2026-06-16', quote: 'my feet never felt tired.', sentiment: 0.8 },
];
const entries = [];
for (const [pinId, reviews, basis] of [[6516, hardware, 'Three independent HoloLens 2 hands-on tests/reviews, not HoloLens 1 or a software-only update. Engadget and Toms Guide describe demo sessions; UploadVR is a later 2021 extended-use review. Their publication dates remain distinct from the 2019 announcement.'], [3710, shoes, 'Three firsthand Alo Runner wear tests from distinct publications. These excerpts support walking comfort and fit; they do not establish suitability for marathon training. Eat This and Travel + Leisure share a publishing family, but have separate named testers; the latter discloses a brand-supplied pair. No Alo Trail/Recovery Mode reviews or retailer ratings substituted.']] as const) {
  const [pin] = await db.query(`SELECT "sourceUrl" FROM "Pin" WHERE "id" = $1`, [pinId]);
  entries.push({ table: 'PinCriticReview', pinId, pinSourceUrl: pin.sourceUrl, basis, reviews,
    evidence: reviews.map((review) => ({ url: review.url, openedAt: '2026-10-26', title: review.title, publishedDate: review.publishedDate, quoteVerified: true, method: 'Opened publisher body and publication byline; Who What Wear date also confirmed in datePublished and time datetime' })) });
}
writeFileSync('scripts/products/product-critic-research-2026-10-26.json', JSON.stringify({ checkedAt: '2026-10-26', entries }, null, 2) + '\n');
await db.closeConnection();
