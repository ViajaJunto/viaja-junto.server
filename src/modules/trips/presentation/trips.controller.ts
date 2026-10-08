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
import { ValidationErrorResponseDto } from '../../../shared/http/dto/error-response.dto.js';
import { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { CreateTripDto } from '../application/dto/create-trip.dto.js';
import { UpdateTripDto } from '../application/dto/update-trip.dto.js';
import { TripResponseDto } from '../application/dto/trip-response.dto.js';
import { TripsService } from '../application/trips.service.js';

@ApiTags('Trips')
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly service: TripsService) {}

  @ApiOperation({
    summary: 'List trips',
    description:
      'Returns a paginated list of trips visible to the authenticated user — the ones they created plus the ones they were invited to.',
  })
  @ApiPaginatedResponse(TripResponseDto, 'Page of trip records.')
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
    summary: 'Get a trip by id',
    description:
      'Returns a single trip. The caller must be the creator or a member of the trip.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiOkResponse({ description: 'The requested trip.', type: TripResponseDto })
  @ApiNotFound('No trip exists with this id.')
  @ApiAuthenticated()
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }

  @ApiOperation({
    summary: 'Create a trip',
    description:
      'Creates a trip and makes the caller its owner. Destinations, activities and the budget are added through their own endpoints.',
  })
  @ApiBody({ type: CreateTripDto })
  @ApiCreatedResponse({
    description: 'The created trip.',
    type: TripResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('The caller is not the creator of the trip.')
  @ApiAuthenticated()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTripDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Update a trip',
    description:
      'Updates name, description, dates or status. The creator cannot be reassigned. Only the creator can do this.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiBody({ type: UpdateTripDto })
  @ApiOkResponse({ description: 'The updated trip.', type: TripResponseDto })
  @ApiNotFound('No trip exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('The caller is not the creator of the trip.')
  @ApiAuthenticated()
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Delete a trip',
    description:
      'Deletes the trip along with its members, destinations, activities and budget. Only the creator can do this.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No trip exists with this id.')
  @ApiForbidden('The caller is not the creator of the trip.')
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
