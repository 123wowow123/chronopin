// Link wikis and the pins built from them as an Open Knowledge Format (OKF
// v0.2) bundle: a directory of markdown concepts with YAML frontmatter.
// https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
//
//   index.md                       okf_version, then the two groups below
//   log.md                         when each link's wiki was written, newest first
//   pins/index.md
//   pins/<id>-<slug>.md            type: Event; sources are its links' concepts
//   sources/index.md
//   sources/<id>-<slug>.md         a link's main page, resource = the link
//   sources/<id>-<slug>/index.md
//   sources/<id>-<slug>/<n>-<slug>.md   its topic or part pages, nesting the same way
//
// Pure: the server loads the rows (src/server/okf.ts) and this renders them.

import { urlKey } from './citations';
import { slugify } from './categories';

export const OKF_VERSION = '0.2';

export type OkfPage = { type: string; title: string; summary: string; body: string; tags: string[]; children: OkfPage[] };

export type OkfSource = {
  id: number;
  url: string;
  title: string | null;
  sourceModifiedDate: string | null;
  generatedBy: string | null;
  utcBuiltDateTime: Date | string | null;
  // When the link was last read (and found unchanged or rewritten from).
  utcFetchedDateTime: Date | string | null;
  wikiVersion: number;
  wiki: OkfPage | null;
};

export type OkfPin = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  utcStartDateTime: Date | string;
  utcEndDateTime: Date | string | null;
  allDay: boolean;
  category: string | null;
  company: string | null;
  longFormSummary: string | null;
  links: { sourceId: number; role: 'source' | 'reference' }[];
};

/* YAML frontmatter */

type Yaml = string | number | boolean | null | undefined | Date | Yaml[] | { [key: string]: Yaml };

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const PLAIN = /^[A-Za-z][\w .()/-]*$/;
const RESERVED = /^(true|false|null|yes|no|on|off|y|n|~)$/i;

function scalar(value: Yaml): string {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return iso(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = String(value);
  // A JSON string is a valid YAML double-quoted scalar.
  return PLAIN.test(s) && !RESERVED.test(s) && !/[ .]$/.test(s) ? s : JSON.stringify(s);
}

const isMap = (value: Yaml): value is { [key: string]: Yaml } =>
  !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const flowMap = (map: { [key: string]: Yaml }) =>
  `{ ${Object.entries(map)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${scalar(v)}`)
    .join(', ')} }`;

// Top-level keys in order; undefined ones are left out. Lists of maps are
// written as blocks, other lists and maps in flow style.
export function frontmatter(fields: { [key: string]: Yaml }): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length && value.every(isMap)) {
      lines.push(`${key}:`);
      for (const item of value as { [key: string]: Yaml }[]) {
        Object.entries(item)
          .filter(([, v]) => v !== undefined)
          .forEach(([k, v], i) => lines.push(`${i ? '    ' : '  - '}${k}: ${isMap(v) ? flowMap(v) : scalar(v)}`));
      }
    } else if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(scalar).join(', ')}]`);
    } else if (isMap(value)) {
      lines.push(`${key}: ${flowMap(value)}`);
    } else {
      lines.push(`${key}: ${scalar(value)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/* Summary HTML as markdown */

const decode = (text: string) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

const CITE = /<cite\b[^>]*?\bdata-ref\s*=\s*(["'])(.*?)\1[^>]*>(?:\s*<\/cite>)?/gi;

// A pin summary ("<ul><li>... <cite data-ref=url></cite></li></ul>") as a
// markdown list whose citations are footnotes keyed by footnoteOf(url) -
// OKF's per-claim attribution, keyed so reordering the sources cannot
// misattribute. Citations with no key are dropped.
export function summaryMarkdown(html: string, footnoteOf: (url: string) => string | undefined): string {
  return decode(
    html
      .replace(CITE, (_m, _q, url: string) => {
        const id = footnoteOf(decode(url));
        return id ? `[^${id}]` : '';
      })
      .replace(/<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, '[$3]($2)')
      .replace(/<\/?(strong|b)>/gi, '**')
      .replace(/<\/?(em|i)>/gi, '_')
      .replace(/<li\b[^>]*>/gi, '\n- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|ul|ol|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ +(\[\^)/g, ' $1')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/* The bundle */

const nameOf = (id: number | string, title: string | null | undefined, fallback: string) =>
  `${id}-${slugify(title || '').slice(0, 60).replace(/-+$/, '') || fallback}`;

const indexEntry = (href: string, title: string, description?: string | null) =>
  `* [${title.replace(/[[\]]/g, '')}](${href})${description ? ` - ${description.replace(/\s+/g, ' ').trim()}` : ''}`;

const at = (d: Date | string | null | undefined) => (d ? new Date(d) : undefined);
const dayStart = (ymd: string | null) => (ymd ? new Date(`${ymd}T00:00:00Z`) : undefined);

// Every file of the bundle, by bundle-relative path (no leading slash).
// recheckDays is how long after a link was last read it is read again (the
// admin setting): a link's pages go stale_after then. With none, pages carry
// no stale_after - a link read only when its pin is viewed has no set date.
export function okfBundle(pins: OkfPin[], sources: OkfSource[], { recheckDays = null }: { recheckDays?: number | null } = {}): Map<string, string> {
  const files = new Map<string, string>();
  const withWiki = sources.filter((s) => s.wiki);
  const conceptPath = new Map<number, string>(); // source id -> "/sources/12-mose.md"

  // A page and, below it, its sub-pages: path is the concept id ("sources/12-mose").
  const writePage = (source: OkfSource, page: OkfPage, path: string, parent?: { title: string; path: string }) => {
    const generated = source.generatedBy ? { by: source.generatedBy, at: at(source.utcBuiltDateTime) } : undefined;
    const checked = source.utcFetchedDateTime ?? source.utcBuiltDateTime;
    const staleAfter = checked && recheckDays ? new Date(+new Date(checked) + recheckDays * 86400000) : undefined;
    const children = page.children.map((child, i) => ({ child, path: `${path}/${nameOf(i + 1, child.title, 'page')}` }));
    const body = [
      parent ? `Part of [${parent.title}](/${parent.path}.md).\n` : '',
      page.body,
      children.length ? `\n# Pages\n\n${children.map(({ child, path: p }) => indexEntry(`/${p}.md`, child.title, child.summary)).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    files.set(
      `${path}.md`,
      `${frontmatter({
        type: page.type,
        title: page.title,
        description: page.summary,
        resource: parent ? undefined : source.url,
        tags: page.tags.length ? page.tags : undefined,
        generated,
        stale_after: staleAfter,
        sources: [{ id: 'link', resource: source.url, title: source.title ?? undefined, last_modified: dayStart(source.sourceModifiedDate) }],
        wiki_version: parent ? undefined : source.wikiVersion,
      })}\n\n${body}\n`,
    );
    if (children.length) {
      files.set(`${path}/index.md`, `# ${page.title}\n\n${children.map(({ child, path: p }) => indexEntry(`${p.slice(path.length + 1)}.md`, child.title, child.summary)).join('\n')}\n`);
    }
    children.forEach(({ child, path: p }) => writePage(source, child, p, { title: page.title, path }));
  };

  for (const source of withWiki) {
    const path = `sources/${nameOf(source.id, source.wiki!.title, 'source')}`;
    conceptPath.set(source.id, `/${path}.md`);
    writePage(source, source.wiki!, path);
  }

  const byId = new Map(sources.map((s) => [s.id, s]));
  const pinPaths: { pin: OkfPin; path: string }[] = [];
  for (const pin of pins) {
    const path = `pins/${nameOf(pin.id, pin.title, 'pin')}`;
    pinPaths.push({ pin, path });
    const links = pin.links.map((l) => ({ ...l, source: byId.get(l.sourceId) })).filter((l) => l.source);
    const footnote = new Map(links.map((l) => [urlKey(l.source!.url), `source-${l.sourceId}`]));
    const summary = pin.longFormSummary ? summaryMarkdown(pin.longFormSummary, (url) => footnote.get(urlKey(url))) : '';
    const cited = new Set([...summary.matchAll(/\[\^([\w-]+)\]/g)].map((m) => m[1]));
    const tags = [pin.category, pin.company].filter((t): t is string => !!t).map((t) => t.toLowerCase());
    const body = [
      summary ? `# Summary\n\n${summary}` : '',
      links.length
        ? `# Links\n\n${links
            .map(({ source, role, sourceId }) =>
              indexEntry(
                conceptPath.get(sourceId) ?? source!.url,
                source!.title || source!.url,
                `${role === 'source' ? 'Source' : 'Reference'}${source!.title ? `: ${source!.url}` : ''}`,
              ),
            )
            .join('\n')}`
        : '',
      links
        .filter((l) => cited.has(`source-${l.sourceId}`))
        .map((l) => `[^source-${l.sourceId}]: ${l.source!.title || l.source!.url}`)
        .join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n');
    files.set(
      `${path}.md`,
      `${frontmatter({
        type: 'Event',
        title: pin.title,
        description: pin.description ?? undefined,
        resource: pin.url,
        tags: tags.length ? tags : undefined,
        // Linking a source to its concept makes the derivation an edge of the
        // bundle graph (OKF 5.1); a link with no wiki yet is named directly.
        sources: links.length
          ? links.map(({ source, sourceId }) => ({
              id: `source-${sourceId}`,
              resource: conceptPath.get(sourceId) ?? source!.url,
              title: source!.title ?? undefined,
              last_modified: dayStart(source!.sourceModifiedDate),
            }))
          : undefined,
        event_start: at(pin.utcStartDateTime),
        event_end: at(pin.utcEndDateTime),
        all_day: pin.allDay,
      })}\n\n${body}\n`,
    );
  }

  files.set('pins/index.md', `# Pins\n\n${pinPaths.map(({ pin, path }) => indexEntry(`${path.slice('pins/'.length)}.md`, pin.title, pin.description)).join('\n')}\n`);
  files.set(
    'sources/index.md',
    `# Sources\n\n${withWiki.map((s) => indexEntry(`${conceptPath.get(s.id)!.slice('/sources/'.length)}`, s.wiki!.title, s.wiki!.summary)).join('\n')}\n`,
  );
  files.set(
    'index.md',
    `${frontmatter({ okf_version: OKF_VERSION })}\n\n# Chronopin\n\n${indexEntry('pins/', 'Pins', `${pins.length} event pin(s), each summarized from the wikis of the links it cites`)}\n${indexEntry('sources/', 'Sources', `${withWiki.length} link(s) - web pages, videos, posts and podcast episodes - each written up as a wiki`)}\n`,
  );

  // Newest first, grouped by UTC day (OKF 9).
  const built = withWiki.filter((s) => s.utcBuiltDateTime).sort((a, b) => +new Date(b.utcBuiltDateTime!) - +new Date(a.utcBuiltDateTime!));
  const days = new Map<string, string[]>();
  for (const s of built) {
    const day = iso(new Date(s.utcBuiltDateTime!)).slice(0, 10);
    const verb = s.wikiVersion > 1 ? `**Update**: Rewrote (version ${s.wikiVersion})` : '**Creation**: Wrote';
    days.set(day, [...(days.get(day) ?? []), `* ${verb} [${s.wiki!.title.replace(/[[\]]/g, '')}](${conceptPath.get(s.id)}) from ${s.url}`]);
  }
  files.set('log.md', `# Update Log\n${[...days].map(([day, entries]) => `\n## ${day}\n${entries.join('\n')}`).join('\n')}\n`);
  return files;
}
