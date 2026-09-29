import type { PinFormValues, ScrapedPin } from './pinForm';

// What the quick form (src/components/forms/QuickPinForm.tsx) does with a
// page once it is read: post the draft, or open the full form for the author
// to finish, and why.
//   entries      a release-notes page: which of its dated entries to pin is theirs to pick
//   unavailable  no AI answer (no key or credit): only the page's own markup was read
//   incomplete   the AI found no title or no start date to post with
export type QuickStep = 'post' | 'entries' | 'unavailable' | 'incomplete';

export function quickStep(scraped: ScrapedPin & { llm?: string }, draft: Pick<PinFormValues, 'title' | 'startDate'>): QuickStep {
  if (scraped.entries?.list.length) return 'entries';
  if (scraped.llm === 'session') return 'unavailable';
  if (!draft.title.trim() || !draft.startDate) return 'incomplete';
  return 'post';
}
