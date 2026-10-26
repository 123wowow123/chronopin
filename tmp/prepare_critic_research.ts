import '../scripts/env';
import * as db from '@/server/db';
import { writeFileSync } from 'node:fs';
const films = [
  { url: 'https://www.theguardian.com/film/2025/jul/22/the-fantastic-four-first-steps-review', title: 'The Fantastic Four: First Steps review – Marvel regains buoyancy with wacky superhero family sitcom', publishedDate: '2025-07-22', quote: 'an entertaining spectacle', sentiment: 0.65 },
  { url: 'https://www.digitaltrends.com/movies/fantastic-four-first-steps-review-marvel-cinematic-universe/', title: 'The Fantastic Four: First Steps review: One giant leap for Marvel', publishedDate: '2025-07-25', quote: 'First Steps is a strong start for the Fantastic Four’s run in the Marvel Cinematic Universe.', sentiment: 0.8 },
  { url: 'https://arstechnica.com/culture/2025/07/review-fantastic-four-first-steps-is-the-best-film-version-so-far/', title: 'Review: Fantastic Four: First Steps is the best film version so far', publishedDate: '2025-07-28', quote: 'The plot makes no sense, but that retro-futuristic Tomorrowland vibe and superb cast make it (mostly) work.', sentiment: 0.4 },
];
const albums = [
  { url: 'https://www.theguardian.com/music/2025/oct/24/lily-allen-west-end-girl-a-gobsmacking-autopsy-of-marital-betrayal', title: 'Lily Allen: West End Girl – a gobsmacking autopsy of marital betrayal', publishedDate: '2025-10-24', quote: 'a great pop album', sentiment: 0.85 },
  { url: 'https://pitchfork.com/reviews/albums/lily-allen-west-end-girl/', title: 'West End Girl', publishedDate: '2025-10-30', quote: 'Lightness isn’t a foil for irony, but a vehicle for hurt.', sentiment: 0.6 },
  { url: 'https://www.thefader.com/2025/10/24/lily-allen-west-end-girl-review', title: 'Lily Allen’s West End Girl review: tea, divorce, and even stranger things', publishedDate: '2025-10-24', quote: 'That would be a shame because there are some great songs on the album.', sentiment: 0.55 },
];
const entries = [];
for (const [pinId, reviews] of [[6148, films], [7389, albums]] as const) {
  const [pin] = await db.query(`SELECT "sourceUrl" FROM "Pin" WHERE "id" = $1`, [pinId]);
  entries.push({ table: 'PinCriticReview', pinId, pinSourceUrl: pin.sourceUrl, basis: 'Three independent opened HTTPS reviews of the exact 2025 film/album; no live-show reviews or other franchise entries. Publication dates and short verbatim verdict extracts checked 2026-10-26. Sentiment estimates use the review rubric.', reviews,
    evidence: reviews.map((review) => ({ url: review.url, openedAt: '2026-10-26', title: review.title, publishedDate: review.publishedDate, quoteVerified: true, method: 'Opened publisher page, publication byline and verbatim review text' })) });
}
writeFileSync('scripts/products/critic-research-2026-10-26.json', JSON.stringify({ checkedAt: '2026-10-26', entries }, null, 2) + '\n');
await db.closeConnection();
