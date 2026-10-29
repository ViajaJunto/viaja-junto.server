import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthenticated } from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '../../../shared/http/decorators/id-param.decorator.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { BudgetSummaryResponseDto } from '../application/dto/budget-summary-response.dto.js';
import { BudgetsService } from '../application/budgets.service.js';

/** The budget of one trip, addressed through the trip. */
@ApiTags('Budgets')
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class BudgetSummaryController {
  constructor(private readonly service: BudgetsService) {}

  @ApiOperation({
    summary: 'Budget summary of a trip',
    description:
      'Total budget, what the trip’s activities plan to spend (derived from their expected cost), the remaining balance, an over-budget flag and the consumption per activity type. Works for a trip without a budget (`totalValue` and `remaining` are null). Any member of the trip can read it.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiOkResponse({ type: BudgetSummaryResponseDto })
  @ApiNotFound(
    'No trip exists with this id, or the caller has no access to it.',
  )
  @ApiAuthenticated()
  @Get(':id/budget/summary')
  summary(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.summarize(id, user);
  }
}
