import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ApiAuthenticated,
  ApiForbidden,
} from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import { ApiNotFound } from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { ValidationErrorResponseDto } from '../../../shared/http/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { ReorderTripDestinationsDto } from '../application/dto/reorder-trip-destinations.dto.js';
import { TripDestinationResponseDto } from '../application/dto/trip-destination-response.dto.js';
import { TripDestinationsService } from '../application/trip-destinations.service.js';

/** The itinerary of one trip, addressed through the trip. */
@ApiTags('Trip Destinations')
@UseGuards(JwtAuthGuard)
@Controller('trips/:tripId/destinations')
export class TripItineraryController {
  constructor(private readonly service: TripDestinationsService) {}

  @ApiOperation({
    summary: 'Reorder the itinerary',
    description:
      'Sets the order of every destination of the trip in one call: send all destination ids in the new order and `order` becomes 0..n-1. Requires EDITOR permission or the trip creator.',
  })
  @ApiParam({
    name: 'tripId',
    description: 'Trip identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiBody({ type: ReorderTripDestinationsDto })
  @ApiOkResponse({
    description: 'The trip’s destinations in their new order.',
    type: [TripDestinationResponseDto],
  })
  @ApiNotFound(
    'No trip exists with this id, or the caller has no access to it.',
  )
  @ApiUnprocessableEntityResponse({
    description:
      'The ids are not exactly the trip’s destinations, each listed once.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('The caller has read-only (VIEWER) access to the trip.')
  @ApiAuthenticated()
  @Put('order')
  reorder(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: ReorderTripDestinationsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reorder(tripId, dto, user);
  }
}
