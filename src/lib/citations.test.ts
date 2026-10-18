import { describe, expect, it } from 'vitest';
import { citeReasoning, orderEvidence, siteOf } from './citations';
import type { Evidence } from './referenceConfidence';

const source: Evidence = { url: 'https://www.macrumors.com/2026/ios', isSource: true, confidence: 90, utcCreatedDateTime: '2026-09-01T00:00:00Z' };
const wiki: Evidence = { url: 'https://en.wikipedia.org/wiki/X', confidence: 70, publishedDate: '2026-09-05' };
const gear: Evidence = { url: 'https://www.gearpatrol.com/roundup', confidence: 60, publishedDate: '2026-08-01' };

describe('siteOf', () => {
  it('finds the host and site name', () => {
    expect(siteOf('https://en.wikipedia.org/wiki/X')).toEqual({ host: 'en.wikipedia.org', name: 'wikipedia' });
    expect(siteOf('https://www.gear-patrol.co.uk/a')).toEqual({ host: 'gear-patrol.co.uk', name: 'gearpatrol' });
  });
});

describe('orderEvidence', () => {
  it('puts the source first, then the newest', () => {
    expect(orderEvidence([gear, wiki, source])).toEqual([source, wiki, gear]);
  });
});

describe('citeReasoning', () => {
  const ordered = orderEvidence([source, wiki, gear]);

  it('cites a host where it is named', () => {
    expect(citeReasoning('Stated as firm, per macrumors.com: "launches Monday."', ordered)).toEqual([
      'Stated as firm, per macrumors.com',
      { cite: [1] },
      ': "launches Monday."',
    ]);
  });

  it('cites site names in words, after a possessive', () => {
    expect(citeReasoning("Per Wikipedia and Gear Patrol's roundup.", ordered)).toEqual([
      'Per Wikipedia',
      { cite: [2] },
      " and Gear Patrol's",
      { cite: [3] },
      ' roundup.',
    ]);
  });

  it('cites the source when the reasoning names nothing', () => {
    expect(citeReasoning('Reported as a locked date', ordered)).toEqual(['Reported as a locked date', { cite: [1] }]);
    expect(citeReasoning('A target, per the source', ordered)).toEqual(['A target, per the source', { cite: [1] }]);
  });

  it('cites nothing for the pin description or without a source', () => {
    expect(citeReasoning('Happened as dated, per the pin description', ordered)).toEqual(['Happened as dated, per the pin description']);
    expect(citeReasoning('Reported as a locked date', [wiki])).toEqual(['Reported as a locked date']);
  });

  it('does not match a site name inside another word', () => {
    expect(citeReasoning('Per wikipedians elsewhere', [wiki])).toEqual(['Per wikipedians elsewhere']);
  });
});
