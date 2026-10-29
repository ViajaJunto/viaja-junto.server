import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
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
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import { ValidationErrorResponseDto } from '../../../shared/http/dto/error-response.dto.js';
import {
  ApiConflict,
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '../../../shared/http/decorators/id-param.decorator.js';
import { ListDestinationCatalogQueryDto } from '../application/dto/list-destination-catalog-query.dto.js';
import { CreateDestinationCatalogDto } from '../application/dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from '../application/dto/update-destination-catalog.dto.js';
import { DestinationCatalogResponseDto } from '../application/dto/destination-catalog-response.dto.js';
import { DestinationCatalogService } from '../application/destination-catalog.service.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { AdminOnly } from '../../catalog-access/presentation/admin-only.decorator.js';
import { ApiPhotoUpload } from '../../../shared/storage/http/api-photo-upload.decorator.js';
import type { UploadedPhoto } from '../../../shared/storage/domain/photo.js';
import { photoFilePipe } from '../../../shared/storage/http/photo-file.pipe.js';
import { PhotoUploadInterceptor } from '../../../shared/storage/http/photo-upload.interceptor.js';

@ApiTags('Destination Catalog')
@Controller('destination-catalog')
export class DestinationCatalogController {
  constructor(private readonly service: DestinationCatalogService) {}

  @ApiOperation({
    summary: 'Browse destinations',
    description:
      'Returns a paginated, alphabetically sorted list of destinations in the shared catalog. Narrow it with `q` (name, case-insensitive), `country` (name or ISO code) and `category`. Public — visitors can browse without an account.',
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
  findAll(@Query() query: ListDestinationCatalogQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a destination by id',
    description:
      'Returns a single catalog destination with its coordinates and average rating. Public.',
  })
  @ApiIdParam('DestinationCatalog identifier.')
  @ApiOkResponse({
    description: 'The requested destination.',
    type: DestinationCatalogResponseDto,
  })
  @ApiNotFound('No destination exists with this id.')
  @Get(':id')
  findOne(@IdParam() id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Add a destination to the catalog',
    description:
      'Registers a destination that any trip can then reference. Administrators only.',
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
  @AdminOnly()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateDestinationCatalogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Update a catalog destination',
    description:
      'Corrects the name, coordinates or description of a catalog entry. Administrators only.',
  })
  @ApiIdParam('DestinationCatalog identifier.')
  @ApiBody({ type: UpdateDestinationCatalogDto })
  @ApiOkResponse({
    description: 'The updated destination.',
    type: DestinationCatalogResponseDto,
  })
  @ApiNotFound('No destination exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @AdminOnly()
  @Patch(':id')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateDestinationCatalogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Remove a destination from the catalog',
    description:
      'Administrators only. Fails with 409 while any trip still references this destination.',
  })
  @ApiIdParam('DestinationCatalog identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No destination exists with this id.')
  @AdminOnly()
  @ApiConflict('The entry is used by trips and cannot be deleted.')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }

  @ApiOperation({
    summary: 'Upload the destination photo',
    description:
      'Stores the image in object storage (S3) and sets `photoUrl` to its public URL. Replaces, and deletes, the previous photo. Administrators only.',
  })
  @ApiPhotoUpload('DestinationCatalog')
  @ApiOkResponse({
    description: 'The destination with its new `photoUrl`.',
    type: DestinationCatalogResponseDto,
  })
  @AdminOnly()
  @Put(':id/photo')
  @UseInterceptors(PhotoUploadInterceptor)
  updatePhoto(
    @IdParam() id: string,
    @UploadedFile(photoFilePipe) file: UploadedPhoto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updatePhoto(id, file, user);
  }
}
