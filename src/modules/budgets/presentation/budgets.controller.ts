import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
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
import {
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../shared/http/dto/error-response.dto.js';
import { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { CreateBudgetDto } from '../application/dto/create-budget.dto.js';
import { UpdateBudgetDto } from '../application/dto/update-budget.dto.js';
import { BudgetResponseDto } from '../application/dto/budget-response.dto.js';
import { BudgetsService } from '../application/budgets.service.js';

@ApiTags('Budgets')
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @ApiOperation({
    summary: 'List budgets',
    description:
      'Returns a paginated list of budgets for trips the caller can see.',
  })
  @ApiPaginatedResponse(BudgetResponseDto, 'Page of budget records.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @ApiAuthenticated()
  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(query, user);
  }

  @ApiOperation({
    summary: 'Get a budget by id',
    description:
      'Returns the budget with its total and the amount already committed to activities.',
  })
  @ApiIdParam('Budget identifier.')
  @ApiOkResponse({
    description: 'The requested budget.',
    type: BudgetResponseDto,
  })
  @ApiNotFound('No budget exists with this id.')
  @ApiAuthenticated()
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }

  @ApiOperation({
    summary: 'Create a trip budget',
    description:
      'Defines the total amount available for a trip. A trip has at most one budget.',
  })
  @ApiBody({ type: CreateBudgetDto })
  @ApiCreatedResponse({
    description: 'The created budget.',
    type: BudgetResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'This trip already has a budget.',
    type: ErrorResponseDto,
  })
  @ApiForbidden('The caller has read-only (VIEWER) access to the trip.')
  @ApiAuthenticated()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBudgetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Update a budget',
    description:
      'Adjusts the total or the amount committed to activities. Requires EDITOR permission on the trip.',
  })
  @ApiIdParam('Budget identifier.')
  @ApiBody({ type: UpdateBudgetDto })
  @ApiOkResponse({
    description: 'The updated budget.',
    type: BudgetResponseDto,
  })
  @ApiNotFound('No budget exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('The caller has read-only (VIEWER) access to the trip.')
  @ApiAuthenticated()
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Delete a budget',
    description:
      'Removes budget tracking from the trip. The trip and its activities are untouched.',
  })
  @ApiIdParam('Budget identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No budget exists with this id.')
  @ApiForbidden('The caller has read-only (VIEWER) access to the trip.')
  @ApiAuthenticated()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }
}
