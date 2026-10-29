/**
 * Escapes `\`, `%` and `_` so a user-supplied string is matched literally.
 *
 * Prisma compiles `contains` and `equals` with `mode: 'insensitive'` to
 * `ILIKE` and does not escape the value, so without this a search for `%`
 * matches every row and `Fran_a` also matches `Franca`. Backslash is the
 * default LIKE escape character in PostgreSQL.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
