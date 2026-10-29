// Domain entity — no framework and no ORM dependency.
import type { Split } from '../../../shared/expenses/index.js';

/** Something a member paid for the trip and that is shared among some of its people. */
export interface TripExpense {
  id: string;
  tripId: string;
  payerId: string;
  /** Minor units (cents, whole yen...) of `currency`. */
  amount: number;
  /** ISO 4217. Usually the trip's currency; when not, `exchangeRate` says how to convert it. */
  currency: string;
  /** Units of the trip currency per 1 unit of `currency`; null when they are the same. */
  exchangeRate: number | null;
  description: string | null;
  spentOn: Date | null;
  split: Split;
  /** Who recorded it (not necessarily who paid). */
  createdBy: string;
  createdAt: Date;
}
