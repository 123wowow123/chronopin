import { describe, expect, it } from 'vitest';
import { eventWords, findPassages, keywordEvidence } from './podcastReferences';

const anchors = eventWords('Grand Ethiopian Renaissance Dam Inaugurated');
const rorshok =
  "Salaam salaam from BA! This is the Rorshok Ethiopia Update from the 11th of September. A quick summary. On Tuesday the 9th, Ethiopia officially inaugurated the Grand Ethiopian Renaissance Dam, the largest dam in Africa.";
const pin = { utcStartDateTime: new Date('2025-09-09T00:00:00Z'), allDay: true };

describe('eventWords', () => {
  it('keeps what the event is about', () => {
    expect(anchors).toEqual(['grand', 'ethiopian', 'renaissance', 'dam']);
    expect(eventWords("Huajiang Canyon Bridge Opens as World's Highest")).toEqual(['huajiang', 'canyon', 'bridge', 'world', 'highest']);
  });
});

describe('findPassages', () => {
  it('returns the stretch that names the event', () => {
    const filler = Array(200).fill('word').join(' ');
    const [passage, ...rest] = findPassages(`${filler} ${rorshok} ${filler}`, anchors);
    expect(rest).toEqual([]);
    expect(passage).toContain('Grand Ethiopian Renaissance Dam');
  });
});

describe('keywordEvidence', () => {
  it('accepts the event named next to its day', () => {
    expect(keywordEvidence(pin, anchors, { releaseDate: '2025-09-12T04:00:00Z' }, [rorshok])).toContain('Tuesday the 9th');
    expect(keywordEvidence(pin, anchors, { releaseDate: '2025-10-01' }, ['The Grand Ethiopian Renaissance Dam opened on September 9th.'])).toContain('September 9th');
    expect(keywordEvidence(pin, anchors, { releaseDate: '2025-10-01' }, ['On 9 September the Grand Ethiopian Renaissance Dam opened.'])).toBeDefined();
  });

  it('turns down another day, or a day said far from the event', () => {
    expect(keywordEvidence(pin, anchors, { releaseDate: '2025-10-01' }, ['The Grand Ethiopian Renaissance Dam opened on September 19th.'])).toBeUndefined();
    const far = `Today I must start off with something. ${Array(40).fill('word').join(' ')} The Grand Ethiopian Renaissance Dam is contested.`;
    expect(keywordEvidence(pin, anchors, { releaseDate: '2025-09-09T10:00:00Z' }, [far])).toBeUndefined();
  });

  it('reads "yesterday" only on the next day\'s episode', () => {
    const text = 'Yesterday the Grand Ethiopian Renaissance Dam was inaugurated.';
    expect(keywordEvidence(pin, anchors, { releaseDate: '2025-09-10T06:00:00Z' }, [text])).toBeDefined();
    expect(keywordEvidence(pin, anchors, { releaseDate: '2025-09-14T06:00:00Z' }, [text])).toBeUndefined();
  });
});
