import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CatalogAccessService } from '../../catalog-access/application/catalog-access.service.js';
import { PhotoStorageService } from '../../../shared/storage/application/photo-storage.service.js';
import type { UploadedPhoto } from '../../../shared/storage/domain/photo.js';
import { ActivityCatalogRepository } from '../domain/activity-catalog.repository.js';
import { CreateActivityCatalogDto } from './dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from './dto/update-activity-catalog.dto.js';
import { ActivityCatalogResponseDto } from './dto/activity-catalog-response.dto.js';

@Injectable()
export class ActivityCatalogService {
  constructor(
    private readonly repository: ActivityCatalogRepository,
    private readonly photos: PhotoStorageService,
    private readonly access: CatalogAccessService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ActivityCatalogResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => ActivityCatalogResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<ActivityCatalogResponseDto> {
    return ActivityCatalogResponseDto.from(await this.getOrFail(id));
  }

  async create(
    dto: CreateActivityCatalogDto,
    user: AuthenticatedUser,
  ): Promise<ActivityCatalogResponseDto> {
    await this.access.assertAdmin(user.id);

    return ActivityCatalogResponseDto.from(
      await this.repository.create({
        ...dto,
        type: dto.type ?? 'OTHER',
      }),
    );
  }

  async update(
    id: string,
    dto: UpdateActivityCatalogDto,
    user: AuthenticatedUser,
  ): Promise<ActivityCatalogResponseDto> {
    await this.getAsAdminOrFail(id, user);

    return ActivityCatalogResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  /**
   * Uploads a new photo and points the record at it.
   *
   * The previous photo is deleted only after the record is updated, and the
   * new one is rolled back if that update fails, so the stored URL always
   * resolves to an existing object.
   */
  async updatePhoto(
    id: string,
    photo: UploadedPhoto,
    user: AuthenticatedUser,
  ): Promise<ActivityCatalogResponseDto> {
    const current = await this.getAsAdminOrFail(id, user);
    const photoUrl = await this.photos.upload({
      folder: 'activities',
      ownerId: id,
      photo,
    });

    let updated;
    try {
      updated = await this.repository.update(id, { photoUrl });
    } catch (error) {
      await this.photos.discard(photoUrl);
      throw error;
    }

    await this.photos.discard(current.photoUrl);

    return ActivityCatalogResponseDto.from(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.access.assertAdmin(user.id);
    const current = await this.getOrFail(id);

    if ((await this.repository.countTripUsages(id)) > 0) {
      throw new ConflictException(
        'This entry is used by trips and cannot be deleted',
      );
    }

    await this.repository.remove(id);
    await this.photos.discard(current.photoUrl);
  }

  /** Checks the caller is an ADMIN before looking the entry up. */
  private async getAsAdminOrFail(id: string, user: AuthenticatedUser) {
    await this.access.assertAdmin(user.id);

    return this.getOrFail(id);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`ActivityCatalog with id "${id}" not found`);
    }

    return found;
  }
}
