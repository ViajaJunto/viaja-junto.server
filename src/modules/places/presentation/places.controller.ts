import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiGatewayTimeoutResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { StrictRateLimit } from '../../../shared/http/throttling.js';
import { ApiNotFound } from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../shared/http/dto/error-response.dto.js';
import { ActivityCatalogResponseDto } from '../../activity-catalog/application/dto/activity-catalog-response.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { AdminOnly } from '../../catalog-access/presentation/admin-only.decorator.js';
import { DestinationCatalogResponseDto } from '../../destination-catalog/application/dto/destination-catalog-response.dto.js';
import { ImportPlaceDto } from '../application/dto/import-place.dto.js';
import { PlaceSearchResponseDto } from '../application/dto/place-response.dto.js';
import { SearchPlacesQueryDto } from '../application/dto/search-places-query.dto.js';
import { PlacesService } from '../application/places.service.js';

const providerErrors = () => [
  ApiServiceUnavailableResponse({
    description:
      'The places service is not configured, or the provider is limiting our requests.',
    type: ErrorResponseDto,
  }),
  ApiBadGatewayResponse({
    description: 'The provider is unreachable or answered something unusable.',
    type: ErrorResponseDto,
  }),
  ApiGatewayTimeoutResponse({
    description: 'The provider did not answer in time.',
    type: ErrorResponseDto,
  }),
];

/** Discovering real-world places (OpenStreetMap) to add to the shared catalogs. */
@ApiTags('Places')
@AdminOnly()
@StrictRateLimit()
@Controller('places')
export class PlacesController {
  constructor(private readonly service: PlacesService) {}

  @ApiOperation({
    summary: 'Search places',
    description:
      'Looks a place up in OpenStreetMap (Nominatim) and tells, for each result, what importing it would create and whether it is already in a catalog. Results are cached and the provider is called at most once per second. Administrators only. Data © OpenStreetMap contributors.',
  })
  @ApiOkResponse({ type: PlaceSearchResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid query.',
    type: ValidationErrorResponseDto,
  })
  @(providerErrors()[0])
  @(providerErrors()[1])
  @(providerErrors()[2])
  @Get('search')
  search(
    @Query() query: SearchPlacesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.search(query, user);
  }

  @ApiOperation({
    summary: 'Import a place as a catalog activity',
    description:
      'Fetches the place again from the provider and adds it to the activity catalog (type guessed from its OSM tags, source `OSM`). Importing the same place twice answers 409. Administrators only.',
  })
  @ApiBody({ type: ImportPlaceDto })
  @ApiCreatedResponse({ type: ActivityCatalogResponseDto })
  @ApiNotFound('The provider does not know this place.')
  @ApiConflictResponse({
    description: 'This place is already in the activity catalog.',
    type: ErrorResponseDto,
  })
  @(providerErrors()[0])
  @(providerErrors()[1])
  @(providerErrors()[2])
  @Post('import/activities')
  @HttpCode(HttpStatus.CREATED)
  importActivity(
    @Body() dto: ImportPlaceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.importActivity(dto.externalId, user);
  }

  @ApiOperation({
    summary: 'Import a place as a catalog destination',
    description:
      'Fetches the place again from the provider and adds it to the destination catalog, with its country and ISO code. Importing the same place twice answers 409. Administrators only.',
  })
  @ApiBody({ type: ImportPlaceDto })
  @ApiCreatedResponse({ type: DestinationCatalogResponseDto })
  @ApiNotFound('The provider does not know this place.')
  @ApiConflictResponse({
    description: 'This place is already in the destination catalog.',
    type: ErrorResponseDto,
  })
  @(providerErrors()[0])
  @(providerErrors()[1])
  @(providerErrors()[2])
  @Post('import/destinations')
  @HttpCode(HttpStatus.CREATED)
  importDestination(
    @Body() dto: ImportPlaceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.importDestination(dto.externalId, user);
  }
}
