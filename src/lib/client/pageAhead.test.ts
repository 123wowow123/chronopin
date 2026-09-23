import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPageAhead } from './pageAhead';

describe('createPageAhead', () => {
  afterEach(() => vi.useRealTimers());

  it('hands over a page fetched ahead instead of fetching it again, once', async () => {
    const fetcher = vi.fn(async (q: string) => `page ${q}`);
    const ahead = createPageAhead(fetcher);
    ahead.warm('?next');
    ahead.warm('?next');
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(ahead.take('?next')).resolves.toBe('page ?next');
    expect(fetcher).toHaveBeenCalledTimes(1);
    // Taken: asked for again, it is fetched again.
    await ahead.take('?next');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('fetches a page nobody warmed, and nothing for no link', async () => {
    const fetcher = vi.fn(async (q: string) => q);
    const ahead = createPageAhead(fetcher);
    ahead.warm(undefined);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(ahead.take('?cold')).resolves.toBe('?cold');
  });

  it('fetches again when the page it holds is too old', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => 'x');
    const ahead = createPageAhead(fetcher, 1000);
    ahead.warm('?a');
    vi.advanceTimersByTime(1500);
    await ahead.take('?a');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('forgets a page that failed, so the next take asks again', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('ok');
    const ahead = createPageAhead(fetcher);
    ahead.warm('?a');
    await Promise.resolve();
    await Promise.resolve();
    await expect(ahead.take('?a')).resolves.toBe('ok');
  });

  it('clear drops what it held', async () => {
    const fetcher = vi.fn(async () => 'x');
    const ahead = createPageAhead(fetcher);
    ahead.warm('?a');
    ahead.clear();
    await ahead.take('?a');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
