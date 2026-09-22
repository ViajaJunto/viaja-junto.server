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
import { CreateTripActivityDto } from '../application/dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from '../application/dto/update-trip-activity.dto.js';
import { TripActivityResponseDto } from '../application/dto/trip-activity-response.dto.js';
import { TripActivitiesService } from '../application/trip-activities.service.js';

@ApiTags('Trip Activities')
@Controller('trip-activities')
export class TripActivitiesController {
  constructor(private readonly service: TripActivitiesService) {}

  @ApiOperation({
    summary: 'List planned activities',
    description:
      'Returns the activities planned for a trip in chronological order. Entries without a date come last.',
  })
  @ApiPaginatedResponse(TripActivityResponseDto, 'Page of planned activity records.')
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
    summary: 'Get a planned activity by id',
    description:
      'Returns one scheduled activity with its time, duration and expected cost.',
  })
  @ApiParam({
    name: 'id',
    description: 'TripActivity identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiOkResponse({ description: 'The requested planned activity.', type: TripActivityResponseDto })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No planned activity exists with this id.',
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
    summary: 'Plan an activity',
    description:
      'Schedules a catalog activity inside one stop of the itinerary. Requires EDITOR permission on the trip.',
  })
  @ApiBody({ type: CreateTripActivityDto })
  @ApiCreatedResponse({ description: 'The created planned activity.', type: TripActivityResponseDto })
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
  create(@Body() dto: CreateTripActivityDto) {
    return this.service.create(dto);
  }

  @ApiOperation({
    summary: 'Update a planned activity',
    description:
      'Adjusts schedule, duration, cost or status. The stop and the catalog entry cannot be reassigned.',
  })
  @ApiParam({
    name: 'id',
    description: 'TripActivity identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiBody({ type: UpdateTripActivityDto })
  @ApiOkResponse({ description: 'The updated planned activity.', type: TripActivityResponseDto })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No planned activity exists with this id.',
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
    @Body() dto: UpdateTripActivityDto,
  ) {
    return this.service.update(id, dto);
  }

  @ApiOperation({
    summary: 'Remove a planned activity',
    description:
      'Removes the activity from the itinerary. The catalog entry is untouched.',
  })
  @ApiParam({
    name: 'id',
    description: 'TripActivity identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No planned activity exists with this id.',
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
