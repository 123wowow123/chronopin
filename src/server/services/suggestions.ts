import type { Row } from '@/server/db';
import { reviewSuggestion, type SuggestionReview } from '@/server/extract/suggestion';
import { ServiceError } from '@/server/extract/wiki';
import AiFeedback from '@/server/model/aiFeedback';
import Pin from '@/server/model/pin';
import { addReferences } from '@/server/services/addReferences';
import { SOURCE_CONFIDENCE } from '@/lib/referenceConfidence';
import log from '../util/log';

// A reader's suggestion on a pin, checked by Claude against the pin's own
// sources (src/server/extract/suggestion.ts). Posting one reviews it once the
// response is out; `npm run suggestions:review` catches up on the rest.

export type ReviewOutcome = 'applied' | 'dismissed' | 'skipped' | 'unavailable' | 'failed';

// Reviews already running in this process, so a double post or the catch-up
// job cannot review one suggestion twice at once.
const running = new Set<number>();

const plain = (html: string | null | undefined) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// A day for an all-day pin (they are UTC days), else the instant.
function when(value: Date | string | null | undefined, allDay: boolean) {
  if (!value) return null;
  const iso = new Date(value).toISOString();
  return allDay ? iso.slice(0, 10) : iso;
}

// What the review is given: the pin as it stands, each link it cites with how
// much it is trusted, and the suggestion.
export function reviewInput(pin: Pin, feedback: Row): string {
  const allDay = !!pin.allDay;
  const start = when(pin.utcStartDateTime, allDay);
  // An all-day pin's end is exclusive; the pin reads it as the day before.
  const endValue = pin.utcEndDateTime && allDay ? new Date(new Date(pin.utcEndDateTime).getTime() - 86_400_000) : pin.utcEndDateTime;
  const end = when(endValue, allDay);
  const lines = [
    `Pin #${pin.id}: ${pin.title}`,
    pin.description ? `Description: ${plain(pin.description)}` : null,
    `Starts: ${start ?? 'no date'}${allDay ? ' (all day)' : ' (UTC)'}`,
    end ? `Ends: ${end}${allDay ? ' (last day, inclusive)' : ' (UTC)'}` : null,
    pin.dateConfidence ? `Date confidence: ${pin.dateConfidence}${pin.dateConfidenceReasoning ? ` - ${plain(pin.dateConfidenceReasoning)}` : ''}` : null,
    pin.company ? `Company: ${pin.company}` : null,
    pin.address ? `Place: ${pin.address}` : null,
    pin.price ? `Cost: ${pin.price} ${pin.priceCurrency || ''}`.trim() : null,
    '',
    'Links the pin cites:',
    pin.sourceUrl ? `[S] ${pin.sourceUrl} - the pin's source, confidence ${SOURCE_CONFIDENCE[(pin.dateConfidence || 'unknown').toLowerCase()] ?? SOURCE_CONFIDENCE.unknown}` : '[S] none',
    ...pin.references.map((r, i) =>
      [
        `[${i + 1}] ${r.url}`,
        r.title ? ` "${r.title}"` : '',
        ` - confidence ${r.confidence}`,
        r.startDate ? `, starts ${r.startDate}` : '',
        r.endDate ? `, ends ${r.endDate}` : '',
        r.reasoning ? `. ${plain(r.reasoning)}` : '',
      ].join(''),
    ),
    '',
    `The reader's suggestion (left ${when(feedback.utcCreatedDateTime, true)}):`,
    '"""',
    String(feedback.feedback).replace(/"""/g, '"'),
    '"""',
    feedback.sourceUrl ? `Link the reader gave: ${feedback.sourceUrl}` : null,
  ];
  return lines.filter((line) => line !== null).join('\n');
}

// Applies a finished review: the references it kept go onto the pin, credited
// to whoever suggested them, and the verdict is recorded on the suggestion.
export async function applyReview(feedback: Row, review: SuggestionReview): Promise<'applied' | 'dismissed' | 'skipped'> {
  // Another review may have finished while this one was searching.
  const current = await AiFeedback.byId(feedback.id);
  if (!current || current.status !== 'open') return 'skipped';

  let added: SuggestionReview['references'] = [];
  if (review.references.length) {
    // Credited to the suggester. With their account gone, added as the
    // author's own: credited to nobody, and nobody notified.
    const userId = Number(current.userId) || Number((await Pin.queryById(current.pinId)).pin?.userId);
    if (userId) {
      const result = await addReferences(current.pinId, review.references, userId);
      const addedUrls = new Set(result?.added.map((r) => r.url));
      added = review.references.filter((r) => addedUrls.has(r.url));
    }
  }
  await AiFeedback.recordReview(feedback.id, { ...review, references: added });
  return added.length ? 'applied' : 'dismissed';
}

// Reviews one open suggestion end to end. Never throws: a failure is logged
// and the suggestion stays open for the catch-up job.
export async function reviewFeedback(id: number): Promise<ReviewOutcome> {
  if (running.has(id)) return 'skipped';
  running.add(id);
  try {
    const feedback = await AiFeedback.byId(id);
    if (!feedback || feedback.status !== 'open') return 'skipped';
    const { pin } = await Pin.queryById(feedback.pinId);
    if (!pin) return 'skipped';

    let review: SuggestionReview | null;
    try {
      review = await reviewSuggestion(reviewInput(pin, feedback), pin.sourceUrl || '');
    } catch (err) {
      if (err instanceof ServiceError) {
        log.warn(`suggestion ${id}: API unavailable, left open -`, err.message);
        return 'unavailable';
      }
      log.warn(`suggestion ${id}: review failed -`, (err as Error)?.message || err);
      await AiFeedback.recordFailure(id);
      return 'failed';
    }
    if (!review) return 'unavailable'; // no API key
    return await applyReview(feedback, review);
  } catch (err) {
    log.warn(`suggestion ${id}: could not be reviewed -`, (err as Error)?.message || err);
    return 'failed';
  } finally {
    running.delete(id);
  }
}
