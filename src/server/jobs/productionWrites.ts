// Share one queue across job tools in this process. A completed request can
// still have background work on the small production VM, so leave it a gap.
// Never retry a failed write here: a timeout may have committed already.
export class ProductionWriteQueue {
  private tail: Promise<void> = Promise.resolve();
  private readyAt = 0;

  constructor(private readonly gapMs = 2000, private readonly failureGapMs = 30_000) {}

  run<T>(write: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      const wait = this.readyAt - Date.now();
      if (wait > 0) await new Promise<void>((resolve) => setTimeout(resolve, wait));
      try {
        const value = await write();
        this.readyAt = Date.now() + this.gapMs;
        return value;
      } catch (error) {
        this.readyAt = Date.now() + this.failureGapMs;
        throw error;
      }
    });
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}

export function productionWrite<T>(write: () => Promise<T>): Promise<T> {
  const g = globalThis as unknown as { __chronopinProductionWrites?: ProductionWriteQueue };
  return (g.__chronopinProductionWrites ??= new ProductionWriteQueue()).run(write);
}
