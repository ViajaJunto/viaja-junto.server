/**
 * Spaces calls at least `intervalMs` apart, however many callers wait at once
 * (Nominatim's usage policy allows one request per second). Callers are served
 * in arrival order.
 */
export class MinIntervalLimiter {
  private lastStart = Number.NEGATIVE_INFINITY;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly intervalMs: number,
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  /** Resolves when the caller may make its request. */
  wait(): Promise<void> {
    const turn = this.queue.then(async () => {
      const delay = this.lastStart + this.intervalMs - this.now();
      if (delay > 0) await this.sleep(delay);
      this.lastStart = this.now();
    });
    // A failing sleep must not block everyone behind it.
    this.queue = turn.catch(() => undefined);

    return turn;
  }
}
