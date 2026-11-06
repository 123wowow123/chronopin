// A company's hub pin and the tree of products under it (CompanyHub /
// CompanyProduct, 0243), as the pin page draws it.

export type HubPinJson = { id: number; title: string; utcStartDateTime: string; allDay: boolean; description?: string | null; thumbName?: string | null; originalUrl?: string | null };

export type HubMilestoneJson = { pinId: number; label: string };

export type HubFactJson = { label: string; value: string; pinId?: number };

export type HubProductJson = {
  id: number;
  name: string;
  summary: string | null;
  // The product page's article: paragraphs with [pin:ID] citations, and its infobox.
  overview: string | null;
  facts: HubFactJson[];
  // Its major events, oldest first by the pins' own dates once resolved.
  milestones: HubMilestoneJson[];
  // The product's own dated thread, in reading order. Empty for a grouping node.
  pins: HubPinJson[];
  children: HubProductJson[];
};

export type CompanyHubJson = {
  companyId: number;
  companyName: string;
  products: HubProductJson[];
};

type FlatProduct = { id: number; parentId: number | null; name: string; summary: string | null; overview?: string | null; facts?: HubFactJson[]; rank: number };

// Nest flat product rows under their parents, siblings by rank then name. A
// row whose parent is missing (or that sits in a cycle) is dropped rather than
// shown at the top level, so a half-deleted branch cannot surface by accident.
export function nestProducts(rows: FlatProduct[], pinsOf: (productId: number) => HubPinJson[], milestonesOf: (productId: number) => HubMilestoneJson[] = () => []): HubProductJson[] {
  const byParent = new Map<number | null, FlatProduct[]>();
  for (const row of rows) byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row]);
  const seen = new Set<number>();
  const build = (parent: number | null): HubProductJson[] =>
    (byParent.get(parent) ?? [])
      .slice()
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
      .flatMap((row) => {
        if (seen.has(row.id)) return [];
        seen.add(row.id);
        return [{ id: row.id, name: row.name, summary: row.summary, overview: row.overview ?? null, facts: row.facts ?? [], milestones: milestonesOf(row.id), pins: pinsOf(row.id), children: build(row.id) }];
      });
  return build(null);
}

// How many pins a branch holds, itself and everything under it.
export function productPinCount(product: HubProductJson): number {
  return product.pins.length + product.children.reduce((n, child) => n + productPinCount(child), 0);
}

import { topicSlug } from './topics';

// The URL segment of a product: /company/tesla/<productSlug>.
export const productSlug = (name: string): string => topicSlug(name);

export function productPath(companyPath: string, product: Pick<HubProductJson, 'name'>): string {
  return `${companyPath}/${encodeURIComponent(productSlug(product.name))}`;
}

// The product with this slug, and the products above it (top level first).
export function findProduct(products: HubProductJson[], slug: string, trail: HubProductJson[] = []): { product: HubProductJson; ancestors: HubProductJson[] } | null {
  for (const product of products) {
    if (productSlug(product.name) === slug) return { product, ancestors: trail };
    const found = findProduct(product.children, slug, [...trail, product]);
    if (found) return found;
  }
  return null;
}

// Every pin a branch lists, itself and everything under it, each once.
export function branchPins(product: HubProductJson): HubPinJson[] {
  const seen = new Map<number, HubPinJson>();
  const walk = (p: HubProductJson) => {
    p.pins.forEach((pin) => seen.set(pin.id, pin));
    p.children.forEach(walk);
  };
  walk(product);
  return [...seen.values()].sort((a, b) => a.utcStartDateTime.localeCompare(b.utcStartDateTime) || a.id - b.id);
}

// An overview as paragraphs of text and citations, the citations numbered in
// the order they first appear (the same pin keeps its number).
export type OverviewPart = { text: string } | { cite: number; pinId: number };
export function overviewParagraphs(overview: string | null): { paragraphs: OverviewPart[][]; cited: number[] } {
  const cited: number[] = [];
  const paragraphs = (overview ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const parts: OverviewPart[] = [];
      let last = 0;
      for (const m of paragraph.matchAll(/\[pin:(\d+)\]/g)) {
        if (m.index > last) parts.push({ text: paragraph.slice(last, m.index) });
        const pinId = Number(m[1]);
        if (!cited.includes(pinId)) cited.push(pinId);
        parts.push({ cite: cited.indexOf(pinId) + 1, pinId });
        last = m.index + m[0].length;
      }
      if (last < paragraph.length) parts.push({ text: paragraph.slice(last) });
      return parts;
    });
  return { paragraphs, cited };
}

// The milestones of a branch (itself and everything under it) as pins, oldest first.
export function branchMilestones(product: HubProductJson): (HubMilestoneJson & { pin: HubPinJson; product: HubProductJson })[] {
  const out: (HubMilestoneJson & { pin: HubPinJson; product: HubProductJson })[] = [];
  const seen = new Set<number>();
  const walk = (p: HubProductJson) => {
    for (const m of p.milestones) {
      const pin = p.pins.find((x) => x.id === m.pinId);
      if (pin && !seen.has(pin.id)) {
        seen.add(pin.id);
        out.push({ ...m, pin, product: p });
      }
    }
    p.children.forEach(walk);
  };
  walk(product);
  return out.sort((a, b) => a.pin.utcStartDateTime.localeCompare(b.pin.utcStartDateTime) || a.pin.id - b.pin.id);
}
