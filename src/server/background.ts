// Work a request starts but does not wait for: a new company's logo lookup,
// say, which fetches over the network and then writes what it found.
//
// A server can simply let these run - it outlives them. A script cannot. It
// finishes, closes the pool, and the write lands afterwards on a pool that is
// gone: db.getPool builds a fresh one, the write succeeds, and that new client
// then sits idle until the pool's idleTimeoutMillis reaps it, holding the
// process open for ten seconds with nothing to do. On a script shorter than
// the lookup, the process exits first and the write is lost outright.
//
// So background work is registered here, and closeConnection drains it before
// ending the pool. Nothing changes at the call sites beyond handing the
// promise over.

const running = new Set<Promise<unknown>>();

// Hands a promise over to be waited for at shutdown. It is deliberately not
// awaited here - the caller carries on, which is the point. Rejections stay
// the caller's to report (they already log); they are swallowed here only so
// that tracking one cannot raise an unhandled rejection of its own.
export function inBackground(work: Promise<unknown>): void {
  const tracked = work.catch(() => undefined);
  running.add(tracked);
  void tracked.then(() => running.delete(tracked));
}

// Waits for everything registered, and for anything it starts in turn.
// Bounded: a script should not hang on a request that never comes back. What
// is still running when the time is up is dropped with the process, as all of
// it was before.
export async function settleBackgroundWork(timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (running.size) {
    const timeLeft = deadline - Date.now();
    if (timeLeft <= 0) {
      break;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<'expired'>((resolve) => {
      timer = setTimeout(() => resolve('expired'), timeLeft);
      timer.unref();
    });
    const settled = Promise.allSettled([...running]).then(() => 'settled' as const);
    try {
      if ((await Promise.race([settled, expired])) === 'expired') {
        break;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  if (running.size) {
    console.log(`${running.size} background task(s) unfinished after ${timeoutMs}ms; leaving them to the process`);
    running.clear();
  }
}
