import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { okfBundle } from './okf';
import { linkTarget, lintBundle, relevantChanges, wikiQualityIssues } from './okfLint';

const bundle = (entries: Record<string, string>) => new Map(Object.entries(entries));

describe('linkTarget', () => {
  it('resolves absolute and relative links inside the bundle only', () => {
    expect(linkTarget('pins/a.md', '/sources/b.md')).toBe('sources/b.md');
    expect(linkTarget('sources/b/c.md', '../b.md#x')).toBe('sources/b.md');
    expect(linkTarget('pins/a.md', 'sub/')).toBe('pins/sub/');
    expect(linkTarget('a.md', '../../src/x.ts')).toBeUndefined();
    expect(linkTarget('a.md', 'https://example.com/x.md')).toBeUndefined();
  });
});

describe('lintBundle', () => {
  it('passes a clean bundle', () => {
    const files = bundle({
      'index.md': '---\nokf_version: "0.2"\n---\n\n# Group\n\n* [A](a.md) - the a concept\n',
      'a.md': '---\ntype: Metric\ntitle: A\nsources:\n  - id: s1\n    resource: https://x.example\ngenerated: { by: human:ian, at: 2026-09-18T00:00:00Z }\n---\n\nSee [b](/b.md). A fact.[^s1]\n\n[^s1]: X\n',
      'b.md': '---\ntype: Metric\n---\n\n```\n[not a link](/nope.md) [^nope]\n```\nInline `[^nope]` too.\n',
      'log.md': '# Log\n\n## 2026-09-19\n* **Update**: b\n\n## 2026-09-18\n* **Creation**: a\n',
    });
    expect(lintBundle(files)).toEqual([]);
  });

  it('flags what breaks conformance and what a producer should not do', () => {
    const files = bundle({
      'index.md': '# Group\n\nloose text\n',
      'notype.md': '---\ntitle: No type\n---\nbody',
      'nofm.md': 'just text',
      'badyaml.md': '---\ntype: [unclosed\n---\n',
      'c.md': '---\ntype: T\nstatus: live\ngenerated: { by: somebody, at: yesterday }\nsources:\n  - id: s1\n---\nClaim.[^s2] Link to [gone](/gone.md).\n',
      'sub/index.md': '---\ntype: X\n---\n',
      'log.md': '## 2026-09-01\n## 2026-09-19\n## Sept\n',
    });
    const got = lintBundle(files).map((i) => `${i.severity} ${i.path}: ${i.message.replace(/:.*$/, '')}`);
    expect(got).toEqual(
      expect.arrayContaining([
        'warning index.md: index entry is not "* [Title](url) - description"',
        'warning index.md: root index.md should declare okf_version',
        'error notype.md: type is missing or empty',
        'error nofm.md: concept has no frontmatter',
        'error badyaml.md: frontmatter is not valid YAML',
        'warning c.md: status should be one of draft, stable, deprecated',
        'warning c.md: generated.by "somebody" does not follow the actor convention',
        'warning c.md: generated.at should be an ISO 8601 datetime with a UTC offset',
        'error c.md: each sources entry needs a resource',
        'error c.md: footnote [^s2] has no sources entry with that id',
        'warning c.md: link to /gone.md does not resolve in the bundle',
        'error sub/index.md: index.md must not have frontmatter',
        'error log.md: log heading "Sept" is not YYYY-MM-DD',
        'warning log.md: log entries should be newest first',
      ]),
    );
  });

  it('passes what okfBundle generates', () => {
    const files = okfBundle(
      [
        {
          id: 1, title: 'Bridge opens', description: null, url: 'https://x.example/pin/1', utcStartDateTime: '2026-09-18T00:00:00Z', utcEndDateTime: null,
          allDay: true, category: null, company: null, longFormSummary: '<ul><li>Opens <cite data-ref="https://a.example/x"></cite></li></ul>', links: [{ sourceId: 7, role: 'source' }],
        },
      ],
      [
        {
          id: 7, url: 'https://a.example/x', title: 'A', sourceModifiedDate: '2026-01-02', generatedBy: 'chronopin-wiki/claude-opus-5', utcBuiltDateTime: '2026-09-18T01:02:03Z', utcFetchedDateTime: null, wikiVersion: 1,
          wiki: { type: 'Web Page', title: 'A page', summary: 'About A.', body: 'Facts', tags: ['a'], children: [{ type: 'Topic', title: 'T', summary: 'T.', body: 't', tags: [], children: [] }] },
        },
      ],
    );
    expect(lintBundle(files)).toEqual([]);
  });

  it('passes the hand-written docs/okf bundle', () => {
    const root = path.join(__dirname, '../../docs/okf');
    const files = new Map<string, string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.set(path.relative(root, full).split(path.sep).join('/'), readFileSync(full, 'utf8'));
      }
    };
    walk(root);
    expect(lintBundle(files)).toEqual([]);
  });
});

describe('wikiQualityIssues', () => {
  type Page = { type: string; title: string; summary: string; body: string; tags: string[]; children: Page[] };
  const page = (body: string, children: Page[] = [], tags = ['x']): Page => ({ type: 'Topic', title: 'T', summary: 'S', body, tags, children });

  it('passes a healthy wiki', () => {
    const root = { ...page('The bridge opens on 18 September after six years of work. '.repeat(8)), type: 'Web Page', children: [page('Tolls are CA$5 per car.'), page('Cyclists get a separate lane.')] };
    expect(wikiQualityIssues(root, 20000)).toEqual([]);
  });

  it('flags thin, blank, repeated, untagged and single-topic wikis', () => {
    const body = 'The bridge opens on 18 September after six years of construction work by the consortium.';
    const root = { ...page(body, [page(`${body} Indeed.`, [], [])]), type: 'Web Page' };
    expect(wikiQualityIssues(root, 20000).map((i) => `${i.severity}: ${i.message.split(':')[0]}`)).toEqual([
      'warning: thin',
      'warning: sub-page(s) repeat their parent',
      'info: 1 of 2 page(s) have no tags',
      'info: a single topic page',
    ]);
    expect(wikiQualityIssues({ ...page(''), type: 'Web Page' }, null)[0].message).toContain('empty title, summary or body');
  });
});

describe('relevantChanges', () => {
  const wiki = 'Fagioli removes MOSE barrier gates for maintenance at the Lido Treporti inlet. Each barrier weighs 250 tonnes. The first barrier section was mobilized in three days.';
  const page = (sidebar: string, body = 'The first barrier section was mobilized in three days by Fagioli.') => `Fagioli at Lido Treporti\n\n${body}\n\nRelated news\n\n${sidebar}`;

  it('ignores rotating sidebars and short lines', () => {
    const before = page('5 Aug 2025\n\nSIMI Assembling Large Wärtsilä Power Plant Engines with Enerpac Hydraulic Gantry');
    const after = page('9 Mar 2022\n\nGrove GMK4100L Erects Potain Tower Crane in Challenging Location\n\nFAGIOLI Loading in Bahrain');
    expect(relevantChanges(before, after, wiki)).toEqual([]);
  });

  it('catches an edited sentence about the subject', () => {
    const before = page('x');
    const after = page('x', 'The first barrier section was mobilized in five days by Fagioli at the Lido Treporti inlet.');
    expect(relevantChanges(before, after, wiki)).toEqual([
      'The first barrier section was mobilized in five days by Fagioli at the Lido Treporti inlet.',
      'The first barrier section was mobilized in three days by Fagioli.',
    ]);
  });
});
