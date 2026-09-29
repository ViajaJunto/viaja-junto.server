import { describe, expect, it } from 'vitest';
import { buildPaginationMeta } from './paginated-response.dto.js';

describe('buildPaginationMeta', () => {
  it('rounds the page count up on a partial last page', () => {
    expect(buildPaginationMeta(1, 20, 41).totalPages).toBe(3);
  });

  it('reports no neighbours on a single page', () => {
    const meta = buildPaginationMeta(1, 20, 5);

    expect(meta).toEqual({
      page: 1,
      limit: 20,
      total: 5,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it('reports both neighbours in the middle of the range', () => {
    const meta = buildPaginationMeta(2, 10, 35);

    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrevious).toBe(true);
  });

  it('reports no next page on the last one', () => {
    expect(buildPaginationMeta(4, 10, 35).hasNext).toBe(false);
  });

  it('handles an empty result set', () => {
    const meta = buildPaginationMeta(1, 20, 0);

    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrevious).toBe(false);
  });

  it('treats a page past the end as having no next page', () => {
    expect(buildPaginationMeta(99, 20, 41).hasNext).toBe(false);
  });
});
