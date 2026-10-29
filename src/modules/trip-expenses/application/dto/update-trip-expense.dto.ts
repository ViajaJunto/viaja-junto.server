import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTripExpenseDto } from './create-trip-expense.dto.js';

/**
 * Request body for changing an expense. Send only what changes; the trip
 * cannot be changed. Changing `currency` or `amount` re-checks the whole
 * expense, so send the matching `exchangeRate` and `split` along.
 */
export class UpdateTripExpenseDto extends PartialType(
  OmitType(CreateTripExpenseDto, ['tripId'] as const),
) {}
