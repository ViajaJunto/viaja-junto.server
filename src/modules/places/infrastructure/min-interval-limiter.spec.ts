import { describe, expect, it } from 'vitest';
import { MinIntervalLimiter } from './min-interval-limiter.js';

/** A clock that only moves when the limiter sleeps. */
function fakeClock() {
  let now = 10_000;
  const sleeps: number[] = [];

  return {
    sleeps,
    now: () => now,
    sleep: (ms: number) => {
      sleeps.push(ms);
      now += ms;
      return Promise.resolve();
    },
  };
}

describe('MinIntervalLimiter', () => {
  it('lets the first caller through without waiting', async () => {
    const clock = fakeClock();
    const limiter = new MinIntervalLimiter(1000, clock.now, clock.sleep);

    await limiter.wait();

    expect(clock.sleeps).toEqual([]);
  });

  it('makes a caller that comes too soon wait for the rest of the interval', async () => {
    const clock = fakeClock();
    const limiter = new MinIntervalLimiter(1000, clock.now, clock.sleep);

    await limiter.wait();
    await limiter.wait();

    expect(clock.sleeps).toEqual([1000]);
  });

  it('does not wait when enough time has passed', async () => {
    const clock = fakeClock();
    const limiter = new MinIntervalLimiter(1000, clock.now, clock.sleep);

    await limiter.wait();
    await clock.sleep(1500);
    clock.sleeps.length = 0;
    await limiter.wait();

    expect(clock.sleeps).toEqual([]);
  });

  it('spaces simultaneous callers one interval apart, in arrival order', async () => {
    const clock = fakeClock();
    const limiter = new MinIntervalLimiter(1000, clock.now, clock.sleep);
    const order: number[] = [];

    await Promise.all(
      [1, 2, 3].map((id) => limiter.wait().then(() => order.push(id))),
    );

    expect(order).toEqual([1, 2, 3]);
    expect(clock.sleeps).toEqual([1000, 1000]);
  });

  it('keeps serving callers after a sleep fails', async () => {
    const clock = fakeClock();
    let failures = 1;
    const limiter = new MinIntervalLimiter(1000, clock.now, (ms) => {
      if (failures-- > 0) return Promise.reject(new Error('timer broke'));
      return clock.sleep(ms);
    });

    await limiter.wait();
    await expect(limiter.wait()).rejects.toThrow('timer broke');
    await expect(limiter.wait()).resolves.toBeUndefined();
  });
});
