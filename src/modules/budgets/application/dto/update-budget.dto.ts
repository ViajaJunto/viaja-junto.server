import { PartialType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto.js';

/**
 * Request body for updating a budget.
 *
 * Derived from CreateBudgetDto, so every validation rule and every piece
 * of OpenAPI metadata stays in one place; here they only become optional.
 */
export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}
