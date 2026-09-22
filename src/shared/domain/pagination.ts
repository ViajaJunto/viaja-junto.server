/**
 * Domain-level pagination types.
 * No HTTP and no ORM dependency — repository contracts and their
 * implementations both speak this language.
 */

/** Window requested from a repository. */
export interface PageRequest {
  skip: number;
  take: number;
}

/** A slice of results plus the total number of existing records. */
export interface Page<T> {
  items: T[];
  total: number;
}
