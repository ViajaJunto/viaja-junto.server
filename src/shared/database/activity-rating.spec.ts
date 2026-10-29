import { describe, expect, it } from 'vitest';
import { roundRating } from './activity-rating.js';

describe('roundRating', () => {
  it.each([
    [4, 4],
    [4.5, 4.5],
    [13 / 3, 4.33],
    [14 / 3, 4.67],
    [4.999, 5],
    [1.005, 1.01],
  ])('rounds %d to %d', (average, rounded) => {
    expect(roundRating(average)).toBe(rounded);
  });
});
