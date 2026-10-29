// Pure helpers for the date rules shared by trips, destinations and activities.
// No framework and no ORM dependency.

/** A nullable calendar boundary, as stored in the `date` columns. */
export type Boundary = Date | null | undefined;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `true` when both ends are set and `end` is earlier than `start`. */
export function endsBeforeStart(start: Boundary, end: Boundary): boolean {
  return !!start && !!end && end.getTime() < start.getTime();
}

/** `true` when `day` (a date at midnight UTC) is outside `[start, end]`. */
export function isOutsideDays(
  day: Boundary,
  start: Boundary,
  end: Boundary,
): boolean {
  if (!day) return false;

  return (
    (!!start && day.getTime() < start.getTime()) ||
    (!!end && day.getTime() > end.getTime())
  );
}

/**
 * `true` when the instant falls outside the days `[start, end]`, both
 * inclusive and taken in UTC: the whole of the last day still counts.
 */
export function isOutsideDayRange(
  instant: Boundary,
  start: Boundary,
  end: Boundary,
): boolean {
  if (!instant) return false;

  return (
    (!!start && instant.getTime() < start.getTime()) ||
    (!!end && instant.getTime() >= end.getTime() + DAY_MS)
  );
}

/** `2026-07-01` — the form used in the error messages. */
export function formatDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}
