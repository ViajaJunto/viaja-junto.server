import {
  endsBeforeStart,
  formatDay,
  isOutsideDays,
  type Boundary,
} from '../../../shared/domain/date-range.js';

export interface DestinationDates {
  arrival?: Boundary;
  departure?: Boundary;
}

/** The dates of the trip a destination belongs to. */
export interface TripRange {
  startDate?: Boundary;
  endDate?: Boundary;
}

/**
 * Business rules for the dates of a destination (FR08): departure is not
 * before arrival, and both fall inside the trip's dates when the trip has
 * them. Returns one message per violation.
 */
export function validateDestinationDates(
  { arrival, departure }: DestinationDates,
  trip: TripRange,
): string[] {
  const errors: string[] = [];

  if (endsBeforeStart(arrival, departure)) {
    errors.push('departure must not be earlier than arrival');
  }

  const tripWindow =
    trip.startDate && trip.endDate
      ? `${formatDay(trip.startDate)} to ${formatDay(trip.endDate)}`
      : trip.startDate
        ? `from ${formatDay(trip.startDate)}`
        : trip.endDate
          ? `until ${formatDay(trip.endDate)}`
          : '';

  for (const [name, day] of [
    ['arrival', arrival],
    ['departure', departure],
  ] as const) {
    if (isOutsideDays(day, trip.startDate, trip.endDate)) {
      errors.push(`${name} must be within the trip dates (${tripWindow})`);
    }
  }

  return errors;
}
