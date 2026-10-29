/** Asserts the `{ data, meta }` envelope of a paginated list. */
export function expectPage(
  body: { data: unknown[]; meta: Record<string, unknown> },
  expected: { page: number; limit: number; total: number },
): void {
  const totalPages = Math.max(1, Math.ceil(expected.total / expected.limit));

  expect(body.meta).toEqual({
    page: expected.page,
    limit: expected.limit,
    total: expected.total,
    totalPages: expected.total === 0 ? 0 : totalPages,
    hasNext: expected.page < totalPages,
    hasPrevious: expected.page > 1,
  });
}
