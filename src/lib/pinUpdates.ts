// What changed on a pin after it was posted (PinUpdate, 0081), for the pin
// page's Updates pane. The pin itself always shows the newest; each update
// says what it moved and what brought it.

import { urlKey } from './citations';

export const PIN_UPDATE_KINDS = ['reference', 'duplicate', 'edit', 'summary'] as const;
export type PinUpdateKind = (typeof PIN_UPDATE_KINDS)[number];

// The fields an update records. start/end are ISO instants (an all-day pin's
// are UTC midnights, its end exclusive), the rest the stored text.
export const TRACKED_FIELDS = ['title', 'description', 'start', 'end', 'address', 'price', 'longFormSummary'] as const;
export type TrackedField = (typeof TRACKED_FIELDS)[number];

export type PinChange = { field: TrackedField; before: string | null; after: string | null; allDay?: boolean };

export type PinUpdateReference = {
  url: string;
  title?: string | null;
  confidence?: number | null;
  publishedDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type PinUpdateJson = {
  id: number;
  pinId: number;
  kind: PinUpdateKind;
  changes: PinChange[];
  references: PinUpdateReference[];
  note: string | null;
  utcCreatedDateTime: string;
  user?: { id: number; userName: string; pictureUrl?: string | null } | null;
  // For 'duplicate': the newer pin of the same event whose source came in.
  relatedPin?: { id: number; title: string; utcCreatedDateTime: string; user?: { userName: string } | null } | null;
};

// The pin as far as an update is concerned.
export type Trackable = {
  title?: string | null;
  description?: string | null;
  longFormSummary?: string | null;
  utcStartDateTime?: string | Date | null;
  utcEndDateTime?: string | Date | null;
  allDay?: boolean | null;
  address?: string | null;
  price?: number | string | null;
};

const text = (value: unknown): string | null => {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
};

const instant = (value: string | Date | null | undefined): string | null => {
  if (value == null || value === '') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};

const price = (value: number | string | null | undefined): string | null => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : null;
};

function fieldValue(pin: Trackable, field: TrackedField): string | null {
  switch (field) {
    case 'start':
      return instant(pin.utcStartDateTime);
    case 'end':
      return instant(pin.utcEndDateTime);
    case 'price':
      return price(pin.price);
    default:
      return text(pin[field]);
  }
}

// The tracked fields that differ between two versions of a pin, in the order
// the pane lists them.
export function pinChanges(before: Trackable, after: Trackable): PinChange[] {
  const changes: PinChange[] = [];
  for (const field of TRACKED_FIELDS) {
    const was = fieldValue(before, field);
    const now = fieldValue(after, field);
    if (was === now) continue;
    const change: PinChange = { field, before: was, after: now };
    if (field === 'start' || field === 'end') change.allDay = !!after.allDay;
    changes.push(change);
  }
  return changes;
}

// Two lists of changes as one: a field changed twice keeps its first before and
// its last after, and drops out when it ends where it started.
export function mergeChanges(earlier: PinChange[], later: PinChange[]): PinChange[] {
  const merged = new Map<TrackedField, PinChange>(earlier.map((c) => [c.field, { ...c }]));
  for (const change of later) {
    const first = merged.get(change.field);
    merged.set(change.field, first ? { ...first, after: change.after, allDay: change.allDay ?? first.allDay } : { ...change });
  }
  return TRACKED_FIELDS.map((field) => merged.get(field)).filter((c): c is PinChange => !!c && c.before !== c.after);
}

// The references in after that before did not have (by page, as the pin's
// own list dedupes them).
export function addedReferences<R extends { url: string }>(before: { url: string }[] | undefined, after: R[] | undefined): R[] {
  const key = (url: string) => urlKey(url) ?? url.trim();
  const had = new Set((before ?? []).map((r) => key(r.url)));
  return (after ?? []).filter((r) => r.url && !had.has(key(r.url)));
}

// A reference as an update keeps it: just what the pane shows.
export function updateReference(r: PinUpdateReference): PinUpdateReference {
  const out: PinUpdateReference = { url: r.url };
  if (r.title) out.title = r.title;
  if (r.confidence != null && Number.isFinite(Number(r.confidence))) out.confidence = Number(r.confidence);
  if (r.publishedDate) out.publishedDate = String(r.publishedDate).slice(0, 10);
  if (r.startDate) out.startDate = String(r.startDate).slice(0, 10);
  if (r.endDate) out.endDate = String(r.endDate).slice(0, 10);
  return out;
}

// An all-day pin's stored end is exclusive; the pane shows its last day.
export function changedDay(value: string | null, allDay: boolean | undefined, field: 'start' | 'end'): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(allDay && field === 'end' ? time - 24 * 60 * 60 * 1000 : time).toISOString();
}
