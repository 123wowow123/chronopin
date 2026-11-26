// A report nobody involved has confirmed (a leak, unnamed sources): kept as a
// pin reference whose reasoning opens "Unconfirmed report:", the rest being what
// readers are told. The pin page gives each its own panel under the market odds,
// and the article rewrite leaves its page out (composeInput), so a rumour never
// reads as fact. Rate it under 50 and give it no startDate, so it cannot set the
// pin's date (topReference).

const PREFIX = /^\s*unconfirmed report\s*:\s*/i;

type Reference = { url: string; title?: string | null; reasoning?: string | null; publishedDate?: string | null };

export type UnconfirmedReport = { url: string; title: string | null; publishedDate: string | null; text: string };

export const isUnconfirmedReport = (reference: { reasoning?: string | null }): boolean => PREFIX.test(reference.reasoning ?? '');

// Newest first; one with no text beyond the prefix has nothing to show.
export function unconfirmedReports(references: Reference[] | null | undefined): UnconfirmedReport[] {
  return (references ?? [])
    .filter(isUnconfirmedReport)
    .map((r) => ({ url: r.url, title: r.title || null, publishedDate: r.publishedDate ? r.publishedDate.slice(0, 10) : null, text: r.reasoning!.replace(PREFIX, '').trim() }))
    .filter((r) => r.text)
    .sort((a, b) => (b.publishedDate ?? '').localeCompare(a.publishedDate ?? ''));
}
