import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  toPageRequest,
} from './pagination-query.dto.js';

describe('toPageRequest', () => {
  it('applies the defaults when the query is empty', () => {
    expect(toPageRequest({})).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      skip: 0,
      take: DEFAULT_LIMIT,
    });
  });

  it('computes skip from page and limit', () => {
    expect(toPageRequest({ page: 4, limit: 25 })).toEqual({
      page: 4,
      limit: 25,
      skip: 75,
      take: 25,
    });
  });

  it('keeps the first page at offset zero', () => {
    expect(toPageRequest({ page: 1, limit: 10 }).skip).toBe(0);
  });

  it('falls back per field when only one is provided', () => {
    expect(toPageRequest({ limit: 5 })).toEqual({
      page: DEFAULT_PAGE,
      limit: 5,
      skip: 0,
      take: 5,
    });
    expect(toPageRequest({ page: 3 })).toEqual({
      page: 3,
      limit: DEFAULT_LIMIT,
      skip: 40,
      take: DEFAULT_LIMIT,
    });
  });
});
