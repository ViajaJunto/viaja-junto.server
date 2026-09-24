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
import { CreateDestinationCatalogDto } from '../application/dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from '../application/dto/update-destination-catalog.dto.js';
import { DestinationCatalogResponseDto } from '../application/dto/destination-catalog-response.dto.js';
import { DestinationCatalogService } from '../application/destination-catalog.service.js';

@ApiTags('Destination Catalog')
@Controller('destination-catalog')
export class DestinationCatalogController {
  constructor(private readonly service: DestinationCatalogService) {}

  @ApiOperation({
    summary: 'Browse destinations',
    description:
      'Returns a paginated, alphabetically sorted list of destinations in the shared catalog. Public — visitors can browse without an account.',
  })
  @ApiPaginatedResponse(
    DestinationCatalogResponseDto,
    'Page of destination records.',
  )
  @ApiUnprocessableEntityResponse({
    description: 'Invalid pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a destination by id',
    description:
      'Returns a single catalog destination with its coordinates and average rating. Public.',
  })
  @ApiParam({
    name: 'id',
    description: 'DestinationCatalog identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiOkResponse({
    description: 'The requested destination.',
    type: DestinationCatalogResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No destination exists with this id.',
    type: ErrorResponseDto,
  })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Add a destination to the catalog',
    description:
      'Registers a destination that any trip can then reference. Requires authentication.',
  })
  @ApiBody({ type: CreateDestinationCatalogDto })
  @ApiCreatedResponse({
    description: 'The created destination.',
    type: DestinationCatalogResponseDto,
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
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDestinationCatalogDto) {
    return this.service.create(dto);
  }

  @ApiOperation({
    summary: 'Update a catalog destination',
    description:
      'Corrects the name, coordinates or description of a catalog entry. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'DestinationCatalog identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiBody({ type: UpdateDestinationCatalogDto })
  @ApiOkResponse({
    description: 'The updated destination.',
    type: DestinationCatalogResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No destination exists with this id.',
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
    @Body() dto: UpdateDestinationCatalogDto,
  ) {
    return this.service.update(id, dto);
  }

  @ApiOperation({
    summary: 'Remove a destination from the catalog',
    description: 'Fails while any trip still references this destination.',
  })
  @ApiParam({
    name: 'id',
    description: 'DestinationCatalog identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiBadRequestResponse({
    description: 'The id in the path is not a valid UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No destination exists with this id.',
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
