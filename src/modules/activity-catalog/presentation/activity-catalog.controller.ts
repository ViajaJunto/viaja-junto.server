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
import { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { CreateActivityCatalogDto } from '../application/dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from '../application/dto/update-activity-catalog.dto.js';
import { ActivityCatalogDetailsResponseDto } from '../application/dto/activity-catalog-details-response.dto.js';
import { ActivityCatalogResponseDto } from '../application/dto/activity-catalog-response.dto.js';
import { ActivityCatalogService } from '../application/activity-catalog.service.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { AdminOnly } from '../../catalog-access/presentation/admin-only.decorator.js';
import { ApiPhotoUpload } from '../../../shared/storage/http/api-photo-upload.decorator.js';
import type { UploadedPhoto } from '../../../shared/storage/domain/photo.js';
import { photoFilePipe } from '../../../shared/storage/http/photo-file.pipe.js';
import { PhotoUploadInterceptor } from '../../../shared/storage/http/photo-upload.interceptor.js';

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
  @ApiIdParam('ActivityCatalog identifier.')
  @ApiOkResponse({
    description: 'The requested activity.',
    type: ActivityCatalogResponseDto,
  })
  @ApiNotFound('No activity exists with this id.')
  @Get(':id')
  findOne(@IdParam() id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Public page of an activity',
    description:
      'The activity with its average rating, how many reviews it is based on and the 10 most recent reviews (newest first). Reviewers appear by name only — never by email. Public.',
  })
  @ApiIdParam('ActivityCatalog identifier.')
  @ApiOkResponse({ type: ActivityCatalogDetailsResponseDto })
  @ApiNotFound('No activity exists with this id.')
  @Get(':id/details')
  findDetails(@IdParam() id: string) {
    return this.service.findDetails(id);
  }

  @ApiOperation({
    summary: 'Add an activity to the catalog',
    description:
      'Registers a tour, restaurant, lodging or transfer that trips can reference. Administrators only.',
  })
  @ApiBody({ type: CreateActivityCatalogDto })
  @ApiCreatedResponse({
    description: 'The created activity.',
    type: ActivityCatalogResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @AdminOnly()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateActivityCatalogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Update a catalog activity',
    description:
      'Corrects details of a catalog entry. Administrators only. The average rating is derived from reviews and cannot be set here.',
  })
  @ApiIdParam('ActivityCatalog identifier.')
  @ApiBody({ type: UpdateActivityCatalogDto })
  @ApiOkResponse({
    description: 'The updated activity.',
    type: ActivityCatalogResponseDto,
  })
  @ApiNotFound('No activity exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @AdminOnly()
  @Patch(':id')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateActivityCatalogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Remove an activity from the catalog',
    description:
      'Administrators only. Fails with 409 while any trip still references this activity.',
  })
  @ApiIdParam('ActivityCatalog identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No activity exists with this id.')
  @AdminOnly()
  @ApiConflict('The entry is used by trips and cannot be deleted.')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }

  @ApiOperation({
    summary: 'Upload the activity photo',
    description:
      'Stores the image in object storage (S3) and sets `photoUrl` to its public URL. Replaces, and deletes, the previous photo. Administrators only.',
  })
  @ApiPhotoUpload('ActivityCatalog')
  @ApiOkResponse({
    description: 'The activity with its new `photoUrl`.',
    type: ActivityCatalogResponseDto,
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
