import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiGatewayTimeoutResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiAuthenticated } from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '../../../shared/http/decorators/id-param.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../shared/http/dto/error-response.dto.js';
import { StrictRateLimit } from '../../../shared/http/throttling.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { ActivityDiscoveryService } from '../application/activity-discovery.service.js';
import { DestinationActivitiesQueryDto } from '../application/dto/destination-activities-query.dto.js';
import { DestinationActivitiesResponseDto } from '../application/dto/destination-activities-response.dto.js';

@ApiTags('Places')
@UseGuards(JwtAuthGuard)
@StrictRateLimit()
@Controller('destination-catalog')
export class DestinationActivitiesController {
  constructor(private readonly service: ActivityDiscoveryService) {}

  @ApiOperation({
    summary: 'Activities of a destination',
    description:
      'Answers from the catalog. When it has fewer than `limit` activities of that type around the destination, asks Google Places for the most popular ones within a radius of the destination’s coordinates (10 km for tours, 5 km for lodging, 3 km for food), copies their name, position and first photo into the catalog, linked to the destination, and answers with them. If Google Places is unavailable, answers with what the catalog has. Show the `attribution` with the data.',
  })
  @ApiIdParam('DestinationCatalog identifier.')
  @ApiOkResponse({ type: DestinationActivitiesResponseDto })
  @ApiNotFound('No destination exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid query.',
    type: ValidationErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      'The places service is not configured, or Google Places is limiting our requests, and the catalog had nothing to show.',
    type: ErrorResponseDto,
  })
  @ApiBadGatewayResponse({
    description:
      'Google Places is unreachable and the catalog had nothing to show.',
    type: ErrorResponseDto,
  })
  @ApiGatewayTimeoutResponse({
    description:
      'Google Places did not answer in time and the catalog had nothing to show.',
    type: ErrorResponseDto,
  })
  @ApiAuthenticated()
  @Get(':id/activities')
  findActivities(
    @IdParam() id: string,
    @Query() query: DestinationActivitiesQueryDto,
  ) {
    return this.service.findForDestination(id, query);
  }
}
