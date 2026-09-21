// Shared by the map's web overlay and graph view: the kinds of relationship
// between pins (see server/services/pinGraph.ts) and how each is drawn.

export type WebKind = 'thread' | 'duplicate' | 'company' | 'tag' | 'source';

export type WebEdge = {
  a: number;
  b: number;
  kind: WebKind;
  // What the two share: a tag's, company's or source's name.
  label?: string;
  // How much they share, weighed by how common each shared thing is.
  strength: number;
  // How many things in all, when they share more than the one named.
  shared?: number;
};

export const WEB_KINDS: { kind: WebKind; label: string; color: string }[] = [
  { kind: 'thread', label: 'Thread', color: '#e0a13a' },
  { kind: 'duplicate', label: 'Duplicate', color: '#e5675e' },
  { kind: 'company', label: 'Company', color: '#4fb5a5' },
  { kind: 'source', label: 'Source', color: '#a68ae8' },
  { kind: 'tag', label: 'Tag', color: '#6f9fe0' },
];

export const webColor = (kind: WebKind) => WEB_KINDS.find((k) => k.kind === kind)!.color;

// What one shared thing is worth before its commonness is taken off it: an
// article or a company is a narrower thing to have in common than a tag.
export const WEB_KIND_WEIGHT: { company: number; source: number; tag: number } = { company: 1, source: 1, tag: 0.8 };

// Lines a pin keeps from what it shares, the strongest first. Threads and
// duplicates are drawn on top of these.
export const MAX_WEB_LINKS = 4;

// The weakest tie worth a line. Under it, what two pins share — one genre tag,
// one busy company — says too little about either to be drawn.
export const MIN_WEB_STRENGTH = 0.8;
// What a declared relation (a thread, a confirmed duplicate) counts for, and
// the point from which a tie is drawn at full strength.
export const FULL_WEB_STRENGTH = 1.6;

// A line's firmness, 0 at the weakest tie drawn and 1 from FULL_WEB_STRENGTH
// up, so the stronger a connection the heavier and more solid it reads.
export const webIntensity = (strength: number) =>
  Math.max(0, Math.min(1, (strength - MIN_WEB_STRENGTH) / (FULL_WEB_STRENGTH - MIN_WEB_STRENGTH)));

// Off, lines drawn between the pins on the map, or the graph panel as well.
export type WebMode = 'off' | 'lines' | 'graph';

export const webModeFromParam = (value: string | null): WebMode => (value === 'lines' || value === 'graph' ? value : 'off');
