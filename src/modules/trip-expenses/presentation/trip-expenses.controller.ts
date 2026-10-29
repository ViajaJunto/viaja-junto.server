import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ApiAuthenticated,
  ApiForbidden,
} from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '../../../shared/http/decorators/id-param.decorator.js';
import { ValidationErrorResponseDto } from '../../../shared/http/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { CreateTripExpenseDto } from '../application/dto/create-trip-expense.dto.js';
import { ExpenseSummaryResponseDto } from '../application/dto/expense-summary-response.dto.js';
import { ListTripExpensesQueryDto } from '../application/dto/list-trip-expenses-query.dto.js';
import { TripExpenseResponseDto } from '../application/dto/trip-expense-response.dto.js';
import { UpdateTripExpenseDto } from '../application/dto/update-trip-expense.dto.js';
import { TripExpensesService } from '../application/trip-expenses.service.js';

const VIEWER = 'The caller has read-only (VIEWER) access to the trip.';
const INVALID =
  'The payload failed validation, or the expense does not make sense: someone is not on the trip, the shares do not add up, or the exchange rate is missing.';

@ApiTags('Trip Expenses')
@UseGuards(JwtAuthGuard)
@Controller('trip-expenses')
export class TripExpensesController {
  constructor(private readonly service: TripExpensesService) {}

  @ApiOperation({
    summary: 'List expenses',
    description:
      'Expenses of the trips the caller created or joined, most recent first. Filter by trip with `?tripId=`, which also checks the caller can see that trip.',
  })
  @ApiPaginatedResponse(TripExpenseResponseDto, 'Page of expenses.')
  @ApiNotFound(
    'The trip filtered by does not exist, or the caller has no access to it.',
  )
  @ApiAuthenticated()
  @Get()
  findAll(
    @Query() query: ListTripExpensesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(query, user);
  }

  @ApiOperation({
    summary: 'Get an expense',
    description: 'Any member of the trip can read it.',
  })
  @ApiIdParam('Expense identifier.')
  @ApiOkResponse({ type: TripExpenseResponseDto })
  @ApiNotFound(
    'No expense exists with this id, or the caller has no access to its trip.',
  )
  @ApiAuthenticated()
  @Get(':id')
  findOne(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @ApiOperation({
    summary: 'Record an expense',
    description:
      'Records something a member paid and how it is shared. `amount` is in minor units (R$ 90,00 → 9000). The payer and everyone in the split must be the creator or a member of the trip. In another currency than the trip’s, the expense needs the `exchangeRate` you paid. Needs EDITOR permission or the trip creator.',
  })
  @ApiBody({ type: CreateTripExpenseDto })
  @ApiCreatedResponse({ type: TripExpenseResponseDto })
  @ApiNotFound(
    'No trip exists with this id, or the caller has no access to it.',
  )
  @ApiUnprocessableEntityResponse({
    description: INVALID,
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden(VIEWER)
  @ApiAuthenticated()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTripExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Change an expense',
    description:
      'Send only what changes. The whole expense is checked again afterwards. Needs EDITOR permission or the trip creator.',
  })
  @ApiIdParam('Expense identifier.')
  @ApiBody({ type: UpdateTripExpenseDto })
  @ApiOkResponse({ type: TripExpenseResponseDto })
  @ApiNotFound(
    'No expense exists with this id, or the caller has no access to its trip.',
  )
  @ApiUnprocessableEntityResponse({
    description: INVALID,
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden(VIEWER)
  @ApiAuthenticated()
  @Patch(':id')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateTripExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Delete an expense',
    description: 'Needs EDITOR permission or the trip creator.',
  })
  @ApiIdParam('Expense identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound(
    'No expense exists with this id, or the caller has no access to its trip.',
  )
  @ApiForbidden(VIEWER)
  @ApiAuthenticated()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}

/** The shared expenses of one trip, addressed through the trip. */
@ApiTags('Trip Expenses')
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripExpenseSummaryController {
  constructor(private readonly service: TripExpensesService) {}

  @ApiOperation({
    summary: 'Who owes whom',
    description:
      'Balances of everyone involved (they always add up to zero) and the payments that would settle them, all in minor units of the trip currency. Any member of the trip can read it.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiOkResponse({ type: ExpenseSummaryResponseDto })
  @ApiNotFound(
    'No trip exists with this id, or the caller has no access to it.',
  )
  @ApiAuthenticated()
  @Get(':id/expenses/summary')
  summary(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.summarize(id, user);
  }
}
