import { afterEach, expect, it, vi } from 'vitest';
import { ProductionWriteQueue } from './productionWrites';

afterEach(() => vi.useRealTimers());

it('keeps overlapping writes serial and gives background work a gap after completion', async () => {
  vi.useFakeTimers();
  const queue = new ProductionWriteQueue();
  let finish!: () => void;
  const firstWrite = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const secondWrite = vi.fn(async () => 'second');
  const first = queue.run(firstWrite);
  const second = queue.run(secondWrite);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(firstWrite).toHaveBeenCalledTimes(1);
  expect(secondWrite).not.toHaveBeenCalled();
  finish();
  await first;
  await vi.advanceTimersByTimeAsync(1999);
  expect(secondWrite).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(await second).toBe('second');
});

it('backs off after a failed write without retrying it or losing later writes', async () => {
  vi.useFakeTimers();
  const queue = new ProductionWriteQueue();
  const failing = vi.fn(async () => { throw new Error('production unavailable'); });
  await expect(queue.run(failing)).rejects.toThrow('production unavailable');
  const nextWrite = vi.fn(async () => 'saved');
  const next = queue.run(nextWrite);
  await vi.advanceTimersByTimeAsync(29_999);
  expect(nextWrite).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(await next).toBe('saved');
  expect(failing).toHaveBeenCalledTimes(1);
});
