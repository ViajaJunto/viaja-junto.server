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
import { CreateTripDestinationDto } from '../application/dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from '../application/dto/update-trip-destination.dto.js';
import { TripDestinationResponseDto } from '../application/dto/trip-destination-response.dto.js';
import { TripDestinationsService } from '../application/trip-destinations.service.js';

@ApiTags('Trip Destinations')
@UseGuards(JwtAuthGuard)
@Controller('trip-destinations')
export class TripDestinationsController {
  constructor(private readonly service: TripDestinationsService) {}

  @ApiOperation({
    summary: 'List trip destinations',
    description:
      'Returns the destinations of a trip in itinerary order. Entries without an explicit order come last.',
  })
  @ApiPaginatedResponse(
    TripDestinationResponseDto,
    'Page of trip destination records.',
  )
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
    summary: 'Get a trip destination by id',
    description:
      'Returns one stop of the itinerary with its arrival and departure dates.',
  })
  @ApiIdParam('TripDestination identifier.')
  @ApiOkResponse({
    description: 'The requested trip destination.',
    type: TripDestinationResponseDto,
  })
  @ApiNotFound('No trip destination exists with this id.')
  @ApiAuthenticated()
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }

  @ApiOperation({
    summary: 'Add a destination to a trip',
    description:
      'Attaches a catalog destination to a trip as one stop of the itinerary. Requires EDITOR permission.',
  })
  @ApiBody({ type: CreateTripDestinationDto })
  @ApiCreatedResponse({
    description: 'The created trip destination.',
    type: TripDestinationResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('The caller has read-only (VIEWER) access to the trip.')
  @ApiAuthenticated()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTripDestinationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Update a trip destination',
    description:
      'Adjusts dates, notes or the position in the itinerary. The trip and the catalog entry cannot be reassigned.',
  })
  @ApiIdParam('TripDestination identifier.')
  @ApiBody({ type: UpdateTripDestinationDto })
  @ApiOkResponse({
    description: 'The updated trip destination.',
    type: TripDestinationResponseDto,
  })
  @ApiNotFound('No trip destination exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('The caller has read-only (VIEWER) access to the trip.')
  @ApiAuthenticated()
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDestinationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Remove a destination from a trip',
    description: 'Also removes every activity planned for that stop.',
  })
  @ApiIdParam('TripDestination identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No trip destination exists with this id.')
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
