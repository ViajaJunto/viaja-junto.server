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
import { CreateActivityCatalogDto } from '../application/dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from '../application/dto/update-activity-catalog.dto.js';
import { ActivityCatalogResponseDto } from '../application/dto/activity-catalog-response.dto.js';
import { ActivityCatalogService } from '../application/activity-catalog.service.js';

@ApiTags('Activity Catalog')
@Controller('activity-catalog')
export class ActivityCatalogController {
  constructor(private readonly service: ActivityCatalogService) {}

  @ApiOperation({
    summary: 'Browse activities',
    description:
      'Returns a paginated, alphabetically sorted list of activities in the shared catalog. Public — this is what powers discovery.',
  })
  @ApiPaginatedResponse(ActivityCatalogResponseDto, 'Page of activity records.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Get an activity by id',
    description:
      'Returns a catalog activity with its location and average rating. Public.',
  })
  @ApiParam({
    name: 'id',
    description: 'ActivityCatalog identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiOkResponse({ description: 'The requested activity.', type: ActivityCatalogResponseDto })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No activity exists with this id.',
    type: ErrorResponseDto,
  })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Add an activity to the catalog',
    description:
      'Registers a tour, restaurant, lodging or transfer that trips can reference. Requires authentication.',
  })
  @ApiBody({ type: CreateActivityCatalogDto })
  @ApiCreatedResponse({ description: 'The created activity.', type: ActivityCatalogResponseDto })
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
  create(@Body() dto: CreateActivityCatalogDto) {
    return this.service.create(dto);
  }

  @ApiOperation({
    summary: 'Update a catalog activity',
    description:
      'Corrects details of a catalog entry. The average rating is derived from reviews and cannot be set here.',
  })
  @ApiParam({
    name: 'id',
    description: 'ActivityCatalog identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiBody({ type: UpdateActivityCatalogDto })
  @ApiOkResponse({ description: 'The updated activity.', type: ActivityCatalogResponseDto })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No activity exists with this id.',
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
    @Body() dto: UpdateActivityCatalogDto,
  ) {
    return this.service.update(id, dto);
  }

  @ApiOperation({
    summary: 'Remove an activity from the catalog',
    description:
      'Fails while any trip still references this activity.',
  })
  @ApiParam({
    name: 'id',
    description: 'ActivityCatalog identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No activity exists with this id.',
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
