import { afterEach, describe, expect, it, vi } from 'vitest';
import { storableText } from '../model/source';
import { captures } from './archive';

const answer = (body: string, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status }) as Response);

afterEach(() => {
  vi.restoreAllMocks();
});

// The whole point of this module is deciding whether the archive has a copy
// of a link, because a link it has no copy of gets written off as dead. So
// "the archive said no" and "the archive did not answer" have to stay apart:
// reading the second as the first is what declares a live link dead.
describe('captures', () => {
  it('reads the rows, newest first, and drops the header', async () => {
    answer(JSON.stringify([
      ['timestamp', 'original'],
      ['20140709084934', 'http://www.neowin.net/news/a-story'],
      ['20150109165148', 'http://www.neowin.net/news/a-story'],
    ]));
    expect(await captures('http://www.neowin.net/news/a-story')).toEqual([
      { timestamp: '20150109165148', url: 'http://www.neowin.net/news/a-story' },
      { timestamp: '20140709084934', url: 'http://www.neowin.net/news/a-story' },
    ]);
  });

  it('puts the capture nearest the date first', async () => {
    answer(JSON.stringify([
      ['timestamp', 'original'],
      ['20200101000000', 'http://site/x'],
      ['20140720000000', 'http://site/x'],
      ['20250101000000', 'http://site/x'],
    ]));
    const found = await captures('http://site/x', new Date('2014-07-15'));
    expect(found[0].timestamp).toBe('20140720000000');
  });

  // An empty JSON array is the archive answering: it has nothing.
  it('reports no captures for an empty array', async () => {
    answer('[]');
    expect(await captures('http://site/never-archived')).toEqual([]);
  });

  // An empty body is CDX failing quietly, which it does under load. Read as
  // "no captures" it would send the caller off to write a dead verdict.
  it('refuses to read an empty body as an answer', async () => {
    answer('');
    await expect(captures('http://site/x')).rejects.toThrow(/empty response/);
  });

  it('refuses to read an error page as an answer', async () => {
    answer('<html><head><title>504 Gateway Time-out</title></head></html>');
    await expect(captures('http://site/x')).rejects.toThrow(/not JSON/);
  });

  // Waited out rather than reported, so the waits are run on fake timers -
  // the real ones add up to over two minutes.
  // A page carrying a NUL byte used to throw on the way into Postgres and
  // take the whole recovery run down with it.
  it('has its NUL bytes stripped before it reaches the database', () => {
    expect(storableText(`Continental${String.fromCharCode(0)} supplying`)).toBe('Continental supplying');
    expect(storableText('nothing to strip')).toBe('nothing to strip');
  });

  it('waits out a busy status, then reports it rather than guessing', async () => {
    vi.useFakeTimers();
    try {
      const fetched = answer('', 503);
      const thrown = expect(captures('http://site/x')).rejects.toThrow(/503/);
      await vi.runAllTimersAsync();
      await thrown;
      // The first go plus MAX_RETRIES more.
      expect(fetched).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });
});
