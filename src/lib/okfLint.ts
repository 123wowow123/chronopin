// Checks an OKF v0.2 bundle against the spec (§11 conformance, plus the
// SHOULDs a producer can get wrong): the bundle okf:export generates and the
// hand-written one in docs/okf alike.
// https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md

import yaml from 'js-yaml';

export type BundleIssue = { severity: 'error' | 'warning'; path: string; message: string };

const RESERVED = /(^|\/)(index|log)\.md$/;
const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;
const ACTOR = /^(human:\S+|process:\S+|[^\s/:]+\/\S+)$/;
const STATUSES = ['draft', 'stable', 'deprecated'];

type Fields = Record<string, unknown>;

// Body text outside code (fenced blocks and inline spans), where links and
// footnotes are live.
const prose = (body: string) => body.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');

function parseFrontmatter(content: string): { fields?: Fields; body: string; error?: string } {
  const match = content.match(FRONTMATTER);
  if (!match) return { body: content };
  try {
    const fields = yaml.load(match[1]);
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return { body: content.slice(match[0].length), error: 'frontmatter is not a mapping' };
    }
    return { fields: fields as Fields, body: content.slice(match[0].length) };
  } catch (err) {
    return { body: content.slice(match[0].length), error: `frontmatter is not valid YAML: ${(err as Error).message.split('\n')[0]}` };
  }
}

// js-yaml reads an unquoted timestamp as a Date and a quoted one as a string.
const isTimestamp = (value: unknown) => value instanceof Date || (typeof value === 'string' && ISO_DATETIME.test(value));

// Where a markdown link from `from` lands inside the bundle, or undefined for
// an external URL, an anchor, or a path that leaves the bundle.
export function linkTarget(from: string, href: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) return undefined;
  const path = href.split('#')[0].split('?')[0];
  if (!path) return undefined;
  const parts = (path.startsWith('/') ? path.slice(1) : [...from.split('/').slice(0, -1), path].join('/')).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      if (!out.length) return undefined;
      out.pop();
    } else if (part && part !== '.') {
      out.push(part);
    }
  }
  return out.join('/') + (path.endsWith('/') ? '/' : '');
}

function checkConcept(path: string, fields: Fields, body: string, issues: BundleIssue[]) {
  const issue = (severity: BundleIssue['severity'], message: string) => issues.push({ severity, path, message });
  if (typeof fields.type !== 'string' || !fields.type.trim()) issue('error', 'type is missing or empty');
  for (const key of ['title', 'description', 'resource'] as const) {
    if (fields[key] !== undefined && typeof fields[key] !== 'string') issue('warning', `${key} should be a string`);
  }
  if (fields.tags !== undefined && !(Array.isArray(fields.tags) && fields.tags.every((t) => typeof t === 'string'))) {
    issue('warning', 'tags should be a list of strings');
  }
  if (fields.status !== undefined && !STATUSES.includes(String(fields.status))) {
    issue('warning', `status should be one of ${STATUSES.join(', ')}`);
  }
  if (fields.stale_after !== undefined && !isTimestamp(fields.stale_after)) issue('warning', 'stale_after should be an ISO 8601 datetime with a UTC offset');

  if (fields.generated !== undefined) {
    const generated = fields.generated as Fields;
    if (!generated || typeof generated !== 'object') issue('warning', 'generated should be a mapping');
    else {
      if (typeof generated.by !== 'string') issue('error', 'generated.by is required');
      else if (!ACTOR.test(generated.by)) issue('warning', `generated.by "${generated.by}" does not follow the actor convention`);
      if (generated.at !== undefined && !isTimestamp(generated.at)) issue('warning', 'generated.at should be an ISO 8601 datetime with a UTC offset');
    }
  }
  if (fields.verified !== undefined) {
    const events = Array.isArray(fields.verified) ? fields.verified : [fields.verified];
    for (const event of events as Fields[]) {
      if (!event || typeof event.by !== 'string') issue('warning', 'each verified entry needs by');
      else if (!ACTOR.test(event.by)) issue('warning', `verified.by "${event.by}" does not follow the actor convention`);
      if (event && event.at !== undefined && !isTimestamp(event.at)) issue('warning', 'verified.at should be an ISO 8601 datetime with a UTC offset');
    }
  }

  const ids = new Set<string>();
  if (fields.sources !== undefined) {
    if (!Array.isArray(fields.sources)) issue('warning', 'sources should be a list');
    else {
      for (const source of fields.sources as Fields[]) {
        if (!source || typeof source.resource !== 'string' || !source.resource) issue('error', 'each sources entry needs a resource');
        if (source?.id !== undefined) {
          const id = String(source.id);
          if (ids.has(id)) issue('warning', `sources id "${id}" is used twice`);
          ids.add(id);
        }
        if (source?.last_modified !== undefined && !isTimestamp(source.last_modified)) {
          issue('warning', 'sources last_modified should be an ISO 8601 datetime with a UTC offset');
        }
      }
    }
  }
  // Footnote labels are the join key into sources (OKF 5.1).
  for (const [, label] of prose(body).matchAll(/\[\^([^\]\s]+)\](?!:)/g)) {
    if (!ids.has(label)) issue('error', `footnote [^${label}] has no sources entry with that id`);
  }
}

function checkIndex(path: string, fields: Fields | undefined, body: string, issues: BundleIssue[]) {
  if (fields && (path !== 'index.md' || Object.keys(fields).some((k) => k !== 'okf_version'))) {
    issues.push({ severity: 'error', path, message: path === 'index.md' ? 'a root index.md frontmatter may only hold okf_version' : 'index.md must not have frontmatter' });
  }
  for (const line of body.split('\n')) {
    const text = line.trim();
    if (text && !text.startsWith('#') && !/^[*-] \[[^\]]*\]\([^)]+\)/.test(text)) {
      issues.push({ severity: 'warning', path, message: `index entry is not "* [Title](url) - description": ${text.slice(0, 60)}` });
    }
  }
}

function checkLog(path: string, fields: Fields | undefined, body: string, issues: BundleIssue[]) {
  if (fields) issues.push({ severity: 'error', path, message: 'log.md must not have frontmatter' });
  const days = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) issues.push({ severity: 'error', path, message: `log heading "${day}" is not YYYY-MM-DD` });
  }
  const valid = days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (valid.some((d, i) => i && d > valid[i - 1])) issues.push({ severity: 'warning', path, message: 'log entries should be newest first' });
}

// Every problem in the bundle, by file. Paths are bundle-relative, no leading slash.
export function lintBundle(files: Map<string, string>): BundleIssue[] {
  const issues: BundleIssue[] = [];
  const paths = new Set(files.keys());
  const exists = (target: string) => (target.endsWith('/') ? [...paths].some((p) => p.startsWith(target)) : paths.has(target));

  for (const [path, content] of files) {
    if (!path.endsWith('.md')) continue;
    const { fields, body, error } = parseFrontmatter(content);
    if (error) issues.push({ severity: 'error', path, message: error });
    const name = path.split('/').pop();
    if (name === 'index.md') checkIndex(path, fields, body, issues);
    else if (name === 'log.md') checkLog(path, fields, body, issues);
    else if (!fields) {
      if (!error) issues.push({ severity: 'error', path, message: 'concept has no frontmatter' });
    } else checkConcept(path, fields, body, issues);

    // Consumers must tolerate broken links (OKF 6.1), but a producer should not make them.
    const hrefs = [...prose(body).matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
    if (fields && typeof fields.resource === 'string') hrefs.push(fields.resource);
    for (const href of hrefs) {
      const target = linkTarget(path, href);
      if (target !== undefined && (target.endsWith('.md') || target.endsWith('/')) && !exists(target)) {
        issues.push({ severity: 'warning', path, message: `link to ${href} does not resolve in the bundle` });
      }
    }
  }
  if (files.has('index.md')) {
    const root = parseFrontmatter(files.get('index.md')!).fields;
    if (!root?.okf_version) issues.push({ severity: 'warning', path: 'index.md', message: 'root index.md should declare okf_version' });
  }
  return issues;
}

export const isReserved = (path: string) => RESERVED.test(path);

/* Wiki quality (okf:lint's quality check) */

export type WikiQualityIssue = { severity: 'warning' | 'info'; message: string };

type QualityPage = { type: string; title: string; summary: string; body: string; tags: string[]; children: QualityPage[] };

// A main page this short, from a link with this much text, lost most of it.
export const THIN_BODY_CHARS = 300;
export const THIN_SOURCE_CHARS = 3000;
// Word overlap past which a sub-page only repeats its parent.
export const REPEAT_OVERLAP = 0.8;

const words = (text: string) => new Set(text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);

// Share of a's words that are also b's (0 when a has none).
export function overlap(a: string, b: string): number {
  const wa = words(a);
  if (!wa.size) return 0;
  const wb = words(b);
  let shared = 0;
  wa.forEach((w) => wb.has(w) && shared++);
  return shared / wa.size;
}

// What is wrong with a link's wiki. Warnings are worth a rewrite; infos only
// worth knowing. textLength is how much text it was written from, if kept.
export function wikiQualityIssues(root: QualityPage, textLength: number | null): WikiQualityIssue[] {
  const issues: WikiQualityIssue[] = [];
  const all: QualityPage[] = [];
  const walk = (page: QualityPage) => {
    all.push(page);
    page.children.forEach(walk);
  };
  walk(root);

  if (textLength != null && textLength > THIN_SOURCE_CHARS && root.body.trim().length < THIN_BODY_CHARS) {
    issues.push({ severity: 'warning', message: `thin: the main page has ${root.body.trim().length} characters from ${textLength} of text` });
  }
  const blank = all.filter((p) => !p.title.trim() || !p.summary.trim() || !p.body.trim());
  if (blank.length) issues.push({ severity: 'warning', message: `${blank.length} page(s) with an empty title, summary or body` });

  const repeats = (page: QualityPage): string[] =>
    page.children.flatMap((child) => [
      ...(overlap(child.body, page.body) >= REPEAT_OVERLAP && child.body.trim().length > 40 ? [child.title] : []),
      ...repeats(child),
    ]);
  const repeated = repeats(root);
  if (repeated.length) issues.push({ severity: 'warning', message: `sub-page(s) repeat their parent: ${repeated.join(', ')}` });

  const untagged = all.filter((p) => !p.tags.length);
  if (untagged.length) issues.push({ severity: 'info', message: `${untagged.length} of ${all.length} page(s) have no tags` });
  if (root.children.length === 1 && root.children[0].type === 'Topic') {
    issues.push({ severity: 'info', message: 'a single topic page: the main page could hold it' });
  }
  return issues;
}

/* Stale links (okf:lint's stale check) */

// A changed line counts when it has at least this many significant words and
// this share of them appear in the link's wiki: rotating "related news",
// dates and navigation do not; a new or edited sentence about the subject does.
export const RELEVANT_MIN_WORDS = 4;
export const RELEVANT_OVERLAP = 0.5;

const significant = (text: string) => (text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []).filter((w) => !/^\d{4}$/.test(w));

const lineSet = (text: string) =>
  new Set(
    text
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  );

// The lines added or removed between two readings of a link that are about
// what its wiki covers. Empty when only page furniture moved.
export function relevantChanges(oldText: string, newText: string, wikiText: string): string[] {
  const before = lineSet(oldText);
  const after = lineSet(newText);
  const vocabulary = new Set(significant(wikiText));
  const changed = [...[...after].filter((l) => !before.has(l)), ...[...before].filter((l) => !after.has(l))];
  return changed.filter((line) => {
    const words = significant(line);
    if (words.length < RELEVANT_MIN_WORDS) return false;
    return words.filter((w) => vocabulary.has(w)).length / words.length >= RELEVANT_OVERLAP;
  });
}
