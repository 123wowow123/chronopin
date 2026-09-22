import { describe, expect, it } from 'vitest';
import { frontmatter, okfBundle, summaryMarkdown, type OkfPage, type OkfPin, type OkfSource } from './okf';

const page = (title: string, type: string, children: OkfPage[] = []): OkfPage => ({
  type,
  title,
  summary: `${title} in a line.`,
  body: `${title} body`,
  tags: ['venice'],
  children,
});

const sources: OkfSource[] = [
  {
    id: 1,
    url: 'https://www.youtube.com/watch?v=4xnsKL8B9JA',
    title: 'Ultra Heavy Lift',
    sourceModifiedDate: '2020-10-03',
    generatedBy: 'chronopin-wiki/claude-opus-5',
    utcBuiltDateTime: '2026-09-18T10:00:00Z',
    utcFetchedDateTime: '2026-09-18T09:00:00Z',
    wikiVersion: 1,
    wiki: page('Installing the MOSE gates', 'YouTube Video', [page('Part one', 'Source Part', [page('Gate 78', 'Topic')])]),
  },
  {
    id: 2,
    url: 'https://en.wikipedia.org/wiki/MOSE',
    title: 'MOSE - Wikipedia',
    sourceModifiedDate: null,
    generatedBy: 'chronopin-wiki/claude-opus-5',
    utcBuiltDateTime: '2026-09-17T10:00:00Z',
    utcFetchedDateTime: null,
    wikiVersion: 2,
    wiki: page('MOSE', 'Web Page'),
  },
  { id: 3, url: 'https://example.com/pending', title: null, sourceModifiedDate: null, generatedBy: null, utcBuiltDateTime: null, utcFetchedDateTime: null, wikiVersion: 0, wiki: null },
];

const pin: OkfPin = {
  id: 930,
  title: "Consorzio Venezia Nuova Installs the Last of MOSE's 78 Flood Gates",
  description: 'The last gate goes in.',
  url: 'https://chronopin.com/pin/930/x',
  utcStartDateTime: '2020-10-03T00:00:00Z',
  utcEndDateTime: null,
  allDay: true,
  categories: ['Infrastructure'],
  company: 'Consorzio Venezia Nuova',
  longFormSummary:
    '<ul><li>The 78th gate is installed <cite data-ref="https://www.youtube.com/watch?v=4xnsKL8B9JA"></cite><cite data-ref="https://en.wikipedia.org/wiki/MOSE"></cite></li><li>Cost &amp; delays <cite data-ref="https://gone.example/x"></cite></li></ul>',
  links: [
    { sourceId: 1, role: 'source' },
    { sourceId: 2, role: 'reference' },
    { sourceId: 3, role: 'reference' },
  ],
};

describe('frontmatter', () => {
  it('quotes what YAML would misread and writes lists of maps as blocks', () => {
    expect(
      frontmatter({
        type: 'Web Page',
        title: 'MOSE: the barrier',
        description: 'yes',
        tags: ['venice', 'flood barrier', '2020'],
        skipped: undefined,
        generated: { by: 'chronopin-wiki/claude-opus-5', at: new Date('2026-09-18T10:00:00Z') },
        sources: [{ id: 'link', resource: 'https://a.example/x?y=1#z', last_modified: undefined }],
      }),
    ).toBe(
      [
        '---',
        'type: Web Page',
        'title: "MOSE: the barrier"',
        'description: "yes"',
        'tags: [venice, flood barrier, "2020"]',
        'generated: { by: chronopin-wiki/claude-opus-5, at: 2026-09-18T10:00:00Z }',
        'sources:',
        '  - id: link',
        '    resource: "https://a.example/x?y=1#z"',
        '---',
      ].join('\n'),
    );
  });
});

describe('summaryMarkdown', () => {
  it('writes the list as markdown and citations as keyed footnotes, dropping unknown ones', () => {
    const keys: Record<string, string> = { 'https://en.wikipedia.org/wiki/MOSE': 'source-2' };
    expect(summaryMarkdown(pin.longFormSummary!, (url) => keys[url])).toBe('- The 78th gate is installed [^source-2]\n- Cost & delays');
  });
});

describe('okfBundle', () => {
  const files = okfBundle([pin], sources, { recheckDays: 30 });

  it('gives every concept frontmatter with a type, and no index.md frontmatter but the root version', () => {
    for (const [path, content] of files) {
      const name = path.split('/').pop();
      if (name === 'index.md' || name === 'log.md') {
        expect(content.startsWith('---'), path).toBe(path === 'index.md');
      } else {
        expect(content, path).toMatch(/^---\ntype: \S.*\n[\s\S]*?\n---\n/);
      }
    }
    expect(files.get('index.md')).toContain('okf_version: "0.2"');
  });

  it('nests sub-pages under their page, each linking back up', () => {
    expect([...files.keys()].sort()).toEqual([
      'index.md',
      'log.md',
      'pins/930-consorzio-venezia-nuova-installs-the-last-of-mose-s-78-flood.md',
      'pins/index.md',
      'sources/1-installing-the-mose-gates.md',
      'sources/1-installing-the-mose-gates/1-part-one.md',
      'sources/1-installing-the-mose-gates/1-part-one/1-gate-78.md',
      'sources/1-installing-the-mose-gates/1-part-one/index.md',
      'sources/1-installing-the-mose-gates/index.md',
      'sources/2-mose.md',
      'sources/index.md',
    ]);
    expect(files.get('sources/1-installing-the-mose-gates/1-part-one/1-gate-78.md')).toContain(
      'Part of [Part one](/sources/1-installing-the-mose-gates/1-part-one.md).',
    );
    expect(files.get('sources/1-installing-the-mose-gates.md')).toContain('resource: "https://www.youtube.com/watch?v=4xnsKL8B9JA"');
    expect(files.get('sources/1-installing-the-mose-gates.md')).toContain('last_modified: 2020-10-03T00:00:00Z');
    expect(files.get('sources/1-installing-the-mose-gates.md')).toContain('stale_after: 2026-10-18T09:00:00Z');
    expect(files.get('sources/2-mose.md')).toContain('stale_after: 2026-10-17T10:00:00Z');
    // Never re-read (the default): no stale_after at all.
    expect(okfBundle([pin], sources).get('sources/2-mose.md')).not.toContain('stale_after');
  });

  it("points a pin's sources at their concepts, or at the link when it has no wiki yet", () => {
    const concept = files.get('pins/930-consorzio-venezia-nuova-installs-the-last-of-mose-s-78-flood.md')!;
    expect(concept).toContain('type: Event');
    expect(concept).toContain('  - id: source-1\n    resource: "/sources/1-installing-the-mose-gates.md"');
    expect(concept).toContain('  - id: source-3\n    resource: "https://example.com/pending"');
    expect(concept).toContain('- The 78th gate is installed [^source-1][^source-2]');
    expect(concept).toContain('* [https://example.com/pending](https://example.com/pending) - Reference\n');
    expect(concept).toContain('[^source-1]: Ultra Heavy Lift\n[^source-2]: MOSE - Wikipedia');
    expect(concept).not.toContain('[^source-3]:');
  });

  it('logs wiki writes newest day first', () => {
    const log = files.get('log.md')!;
    expect(log.indexOf('## 2026-09-18')).toBeLessThan(log.indexOf('## 2026-09-17'));
    expect(log).toContain('**Update**: Rewrote (version 2) [MOSE](/sources/2-mose.md)');
  });
});

describe('okfBundle tags', () => {
  const tagged: OkfPin = {
    ...pin,
    tags: [
      { name: 'Tokyo Anime Award Festival 2024', kind: 'award', source: 'award' },
      { name: 'MOSE', kind: 'topic', source: 'user' },
    ],
  };
  const other: OkfPin = { ...pin, id: 931, title: 'MOSE Raised for the Acqua Alta', links: [], tags: [{ name: 'mose', kind: 'topic', source: 'user' }] };
  const files = okfBundle([tagged, other], sources);
  const concept = files.get('pins/930-consorzio-venezia-nuova-installs-the-last-of-mose-s-78-flood.md')!;

  it('writes the tags into the pin concept’s frontmatter and links their concepts', () => {
    expect(concept).toContain('tags: [infrastructure, consorzio venezia nuova, tokyo anime award festival 2024, mose]');
    expect(concept).toContain('* [Tokyo Anime Award Festival 2024](/tags/tokyo-anime-award-festival-2024.md)');
  });

  it('gives each tag one concept listing its pins, an award as an Award', () => {
    const award = files.get('tags/tokyo-anime-award-festival-2024.md')!;
    expect(award).toContain('type: Award');
    expect(award).toContain('(/pins/930-consorzio-venezia-nuova-installs-the-last-of-mose-s-78-flood.md)');
    const mose = files.get('tags/mose.md')!;
    expect(mose).toContain('type: Tag');
    expect(mose).toContain('2 pin(s) tagged MOSE');
    expect(files.get('tags/index.md')).toContain('* [MOSE](mose.md) - 2 pin(s)');
    expect(files.get('index.md')).toContain('(tags/)');
  });

  it('leaves the tags out of a bundle with none', () => {
    expect([...okfBundle([pin], sources).keys()].some((p) => p.startsWith('tags/'))).toBe(false);
  });

  it('passes the conformance lint', async () => {
    const { lintBundle } = await import('./okfLint');
    expect(lintBundle(files).filter((i) => i.severity === 'error' || /tags\//.test(i.path) || /tags\//.test(i.message))).toEqual([]);
  });
});
