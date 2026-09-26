import { describe, expect, it } from 'vitest';
import { looksLikePlaceText, placeNames, placePatterns, typedTextPattern, wholeWordPattern } from './placeMatch';

// Postgres character classes are not JavaScript's, so a pattern is read here
// the way Postgres would read it against a real address.
const matches = (patterns: string[], address: string) =>
  patterns.some((pattern) => new RegExp(pattern.replaceAll('[:alnum:]', 'a-zA-Z0-9'), 'i').test(address));

describe('placeNames', () => {
  it('gives a US state both its name and its code, whichever was searched', () => {
    expect(placeNames('California')).toEqual(['California', 'CA']);
    expect(placeNames('ny')).toEqual(['New York', 'NY']);
    expect(placeNames('Chicago')).toEqual(['Chicago']);
  });

  it('keeps Washington the word out of the state code, since the city is not the state', () => {
    expect(placeNames('Washington')).toEqual(['Washington']);
    expect(placeNames('WA')).toEqual(['Washington', 'WA']);
  });
});

describe('placePatterns', () => {
  it('finds a city, a state and a postal code within an address line', () => {
    expect(matches(placePatterns(['Paris']), "93 Quai d'Orsay, 75007 Paris, France")).toBe(true);
    expect(matches(placePatterns(['New York']), 'Statue of Liberty, Liberty Island, New York, NY 10004, USA')).toBe(true);
    expect(matches(placePatterns(['10004']), 'Statue of Liberty, Liberty Island, New York, NY 10004, USA')).toBe(true);
    expect(matches(placePatterns(['Rhode Island']), 'Newport, Rhode Island, United States')).toBe(true);
  });

  it('finds a state written either way', () => {
    expect(matches(placePatterns(['California']), 'Apple Park, Cupertino, CA 95014, USA')).toBe(true);
    expect(matches(placePatterns(['NC']), 'Kill Devil Hills, North Carolina, USA')).toBe(true);
  });

  it('takes whole words only, so a place is not part of another', () => {
    expect(matches(placePatterns(['NY']), 'Nyack, New Jersey, USA')).toBe(false);
    expect(matches(placePatterns(['6060']), 'Chicago, IL 60601, USA')).toBe(false);
    expect(matches(placePatterns(['Paris']), 'Parisville, Michigan, USA')).toBe(false);
  });

  it('matches any of several places, and takes the value literally', () => {
    const patterns = placePatterns(['Egypt', 'Cambodia']);
    expect(matches(patterns, 'Giza Pyramid Complex, Giza, Egypt')).toBe(true);
    expect(matches(patterns, 'Angkor Wat, Krong Siem Reap, Cambodia')).toBe(true);
    expect(matches(patterns, 'Stonehenge, Wiltshire, England')).toBe(false);
    expect(wholeWordPattern(' a.b ')).toBe('(^|[^[:alnum:]])a\\.b([^[:alnum:]]|$)');
  });
});

describe('looksLikePlaceText', () => {
  it('passes free text worth looking for in an address, and nothing thinner', () => {
    expect(looksLikePlaceText('chicago')).toBe(true);
    expect(looksLikePlaceText('京都')).toBe(true);
    expect(looksLikePlaceText('a')).toBe(false);
    expect(looksLikePlaceText(' - ')).toBe(false);
  });
});

describe('typedTextPattern', () => {
  it('finds Chinese and Japanese anywhere in a title, which has no spaces to find words by', () => {
    expect(matches([typedTextPattern('台积电')], '台积电在高雄开始量产 2 纳米芯片')).toBe(true);
    expect(matches([typedTextPattern('ナウシカ')], '『風の谷のナウシカ』劇場公開')).toBe(true);
  });

  it('keeps other text to whole words', () => {
    expect(matches([typedTextPattern('Gucci')], 'Kering nombra a Stefano Cantino CEO de Gucci')).toBe(true);
    expect(matches([typedTextPattern('ford')], 'Oxford abre su nuevo campus')).toBe(false);
  });

  it('reads regex characters in the text as themselves', () => {
    expect(typedTextPattern('C++ 入门')).toBe('C\\+\\+ 入门');
  });
});
