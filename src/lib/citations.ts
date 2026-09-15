import { type Evidence, referenceTime } from './referenceConfidence';

export const isHttpUrl = (url: string | undefined) => !!url && /^https?:\/\//i.test(url);

// The order a pin's references are listed and numbered in: the source first,
// then newest first. Citation [n] is the nth of these.
export function orderEvidence(evidence: Evidence[]): Evidence[] {
  return evidence
    .filter((e) => isHttpUrl(e.url))
    .map((reference) => ({ reference, time: referenceTime(reference) }))
    .sort((a, b) => Number(!!b.reference.isSource) - Number(!!a.reference.isSource) || (b.time ?? Infinity) - (a.time ?? Infinity))
    .map(({ reference }) => reference);
}

export type CitationSegment = string | { cite: number[] };

const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu']);

// "en.wikipedia.org" -> host "en.wikipedia.org", name "wikipedia";
// "www.gear-patrol.co.uk" -> "gear-patrol.co.uk", "gearpatrol".
export function siteOf(url: string): { host: string; name: string } | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return undefined;
  }
  const parts = host.split('.');
  let i = parts.length - 2;
  if (parts.length > 2 && SECOND_LEVEL.has(parts[i]) && parts[parts.length - 1].length === 2) i--;
  return { host, name: (parts[Math.max(i, 0)] || host).replace(/-/g, '') };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Splits reasoning text so each reference it names is followed by a citation
// of that reference's number in `ordered`. A reference is named by its host
// ("per macrumors.com") or its site name in words ("Gear Patrol's roundup",
// "per Wikipedia"); "the source" names the source. Reasoning that names none
// is read as coming from the source and cites it at the end - unless it rests
// on the pin description, which is not a link.
export function citeReasoning(text: string, ordered: Evidence[]): CitationSegment[] {
  const cites = new Map<number, Set<number>>(); // end offset -> reference numbers
  const cited = new Set<number>();
  const add = (end: number, n: number) => {
    if (cited.has(n)) return;
    cited.add(n);
    if (!cites.has(end)) cites.set(end, new Set());
    cites.get(end)!.add(n);
  };

  const words = [...text.matchAll(/[A-Za-z0-9]+/g)].map((m) => ({ start: m.index!, end: m.index! + m[0].length, word: m[0].toLowerCase() }));

  ordered.forEach((reference, index) => {
    const n = index + 1;
    const site = siteOf(reference.url);
    if (!site) return;
    const hostMatch = new RegExp(`(?<![\\w.-])${escapeRegExp(site.host)}(?![\\w-])`, 'i').exec(text);
    if (hostMatch) {
      add(hostMatch.index + hostMatch[0].length, n);
      return;
    }
    if (site.name.length < 3) return;
    for (let i = 0; i < words.length; i++) {
      let joined = '';
      for (let j = i; j < Math.min(i + 3, words.length); j++) {
        if (j > i && !/^[ -]$/.test(text.slice(words[j - 1].end, words[j].start))) break;
        joined += words[j].word;
        if (joined === site.name) {
          const possessive = /^['’]s\b/.exec(text.slice(words[j].end));
          add(words[j].end + (possessive ? possessive[0].length : 0), n);
          return;
        }
        if (!site.name.startsWith(joined)) break;
      }
    }
  });

  const sourceNumber = ordered.findIndex((e) => e.isSource) + 1;
  if (sourceNumber) {
    const theSource = /\bthe source\b/i.exec(text);
    if (theSource) {
      add(theSource.index + theSource[0].length, sourceNumber);
    } else if (!cited.size && !/\bpin description\b/i.test(text)) {
      add(text.length, sourceNumber);
    }
  }

  const segments: CitationSegment[] = [];
  let at = 0;
  for (const end of [...cites.keys()].sort((a, b) => a - b)) {
    if (end > at) segments.push(text.slice(at, end));
    segments.push({ cite: [...cites.get(end)!].sort((a, b) => a - b) });
    at = end;
  }
  if (at < text.length) segments.push(text.slice(at));
  return segments;
}
