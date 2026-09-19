// Shared by the map's web overlay and graph view: the kinds of relationship
// between pins (see server/services/pinGraph.ts) and how each is drawn.

export type WebKind = 'thread' | 'duplicate' | 'company' | 'tag' | 'source';

export type WebEdge = { a: number; b: number; kind: WebKind; label?: string };

export const WEB_KINDS: { kind: WebKind; label: string; color: string }[] = [
  { kind: 'thread', label: 'Thread', color: '#e0a13a' },
  { kind: 'duplicate', label: 'Duplicate', color: '#e5675e' },
  { kind: 'company', label: 'Company', color: '#4fb5a5' },
  { kind: 'source', label: 'Source', color: '#a68ae8' },
  { kind: 'tag', label: 'Tag', color: '#6f9fe0' },
];

export const webColor = (kind: WebKind) => WEB_KINDS.find((k) => k.kind === kind)!.color;

// Off, lines drawn between the pins on the map, or the graph panel as well.
export type WebMode = 'off' | 'lines' | 'graph';

export const webModeFromParam = (value: string | null): WebMode => (value === 'lines' || value === 'graph' ? value : 'off');
