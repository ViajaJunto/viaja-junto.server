import {
  formatDay,
  isOutsideDayRange,
  type Boundary,
} from '../../../shared/domain/date-range.js';

/** The stay of the destination an activity is planned in. */
export interface DestinationStay {
  arrival?: Boundary;
  departure?: Boundary;
}

/**
 * Business rule for when an activity happens (FR13): its `dateTime` falls
 * within the destination's stay, whole days and UTC, so the departure day
 * still counts. Returns one message per violation.
 */
export function validateActivityDateTime(
  dateTime: Boundary,
  { arrival, departure }: DestinationStay,
): string[] {
  if (!isOutsideDayRange(dateTime, arrival, departure)) {
    return [];
  }

  const stay =
    arrival && departure
      ? `${formatDay(arrival)} to ${formatDay(departure)}`
      : arrival
        ? `from ${formatDay(arrival)}`
        : `until ${formatDay(departure as Date)}`;

  return [`dateTime must be within the destination stay (${stay})`];
}
