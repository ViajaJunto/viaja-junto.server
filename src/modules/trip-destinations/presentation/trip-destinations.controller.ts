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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../shared/http/dto/error-response.dto.js';
import { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { CreateTripDestinationDto } from '../application/dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from '../application/dto/update-trip-destination.dto.js';
import { TripDestinationResponseDto } from '../application/dto/trip-destination-response.dto.js';
import { TripDestinationsService } from '../application/trip-destinations.service.js';

@ApiTags('Trip Destinations')
@Controller('trip-destinations')
export class TripDestinationsController {
  constructor(private readonly service: TripDestinationsService) {}

  @ApiOperation({
    summary: 'List trip destinations',
    description:
      'Returns the destinations of a trip in itinerary order. Entries without an explicit order come last.',
  })
  @ApiPaginatedResponse(TripDestinationResponseDto, 'Page of trip destination records.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @ApiBearerAuth('bearer')
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    type: ErrorResponseDto,
  })
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a trip destination by id',
    description:
      'Returns one stop of the itinerary with its arrival and departure dates.',
  })
  @ApiParam({
    name: 'id',
    description: 'TripDestination identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiOkResponse({ description: 'The requested trip destination.', type: TripDestinationResponseDto })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No trip destination exists with this id.',
    type: ErrorResponseDto,
  })
  @ApiBearerAuth('bearer')
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    type: ErrorResponseDto,
  })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Add a destination to a trip',
    description:
      'Attaches a catalog destination to a trip as one stop of the itinerary. Requires EDITOR permission.',
  })
  @ApiBody({ type: CreateTripDestinationDto })
  @ApiCreatedResponse({ description: 'The created trip destination.', type: TripDestinationResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiBearerAuth('bearer')
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    type: ErrorResponseDto,
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTripDestinationDto) {
    return this.service.create(dto);
  }

  @ApiOperation({
    summary: 'Update a trip destination',
    description:
      'Adjusts dates, notes or the position in the itinerary. The trip and the catalog entry cannot be reassigned.',
  })
  @ApiParam({
    name: 'id',
    description: 'TripDestination identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiBody({ type: UpdateTripDestinationDto })
  @ApiOkResponse({ description: 'The updated trip destination.', type: TripDestinationResponseDto })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No trip destination exists with this id.',
    type: ErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiBearerAuth('bearer')
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    type: ErrorResponseDto,
  })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDestinationDto,
  ) {
    return this.service.update(id, dto);
  }

  @ApiOperation({
    summary: 'Remove a destination from a trip',
    description:
      'Also removes every activity planned for that stop.',
  })
  @ApiParam({
    name: 'id',
    description: 'TripDestination identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No trip destination exists with this id.',
    type: ErrorResponseDto,
  })
  @ApiBearerAuth('bearer')
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
    type: ErrorResponseDto,
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
