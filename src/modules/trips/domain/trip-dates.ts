import {
  endsBeforeStart,
  type Boundary,
} from '../../../shared/domain/date-range.js';

export interface TripDates {
  startDate?: Boundary;
  endDate?: Boundary;
}

/** Business rules for the dates of a trip (FR04). Returns one message per violation. */
export function validateTripDates({ startDate, endDate }: TripDates): string[] {
  return endsBeforeStart(startDate, endDate)
    ? ['endDate must not be earlier than startDate']
    : [];
}
