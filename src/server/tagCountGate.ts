import { shedding } from './botLimit';

// The search tag cloud's counts (searchTagCounts) are a DISTINCT join over every
// matching pin's tags, 1-20 s of CPU when a swarm of distinct searches misses the
// cache (2026-10-26: 64% of Postgres's active samples, 99% of a core on the
// 2-vCPU VM). An uncached count runs only while the server is not shedding load,
// and at most TAG_COUNT_SLOTS at once; a request that cannot get a slot within
// TAG_COUNT_WAIT_MS gets TagCountBusy and the page shows no cloud. Callers throw
// it out of their 'use cache' function so the empty answer is never cached.
export const TAG_COUNT_SLOTS = 2;
export const TAG_COUNT_WAIT_MS = 3_000;

export class TagCountBusy extends Error {
  constructor() {
    super('tag counts busy');
  }
}

type Gate = { active: number; waiting: Array<() => void> };

function gate(): Gate {
  const g = globalThis as unknown as { __chronopinTagCountGate?: Gate };
  return (g.__chronopinTagCountGate ??= { active: 0, waiting: [] });
}

export async function withTagCountSlot<T>(run: () => Promise<T>, shed = shedding()): Promise<T> {
  if (shed) throw new TagCountBusy();
  const state = gate();
  if (state.active >= TAG_COUNT_SLOTS) {
    const got = await new Promise<boolean>((resolve) => {
      const wake = () => {
        clearTimeout(timer);
        resolve(true);
      };
      const timer = setTimeout(() => {
        const at = state.waiting.indexOf(wake);
        if (at >= 0) state.waiting.splice(at, 1);
        resolve(false);
      }, TAG_COUNT_WAIT_MS);
      state.waiting.push(wake);
    });
    if (!got) throw new TagCountBusy();
  } else {
    state.active++;
  }
  try {
    return await run();
  } finally {
    // Hand the slot to the next waiter, else free it.
    const next = state.waiting.shift();
    if (next) next();
    else state.active--;
  }
}
