import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
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
  ): Promise<ActivityCatalogResponseDto> {
    return ActivityCatalogResponseDto.from(
      await this.repository.create({ ...dto, type: dto.type ?? 'OTHER' }),
    );
  }

  async update(
    id: string,
    dto: UpdateActivityCatalogDto,
  ): Promise<ActivityCatalogResponseDto> {
    await this.getOrFail(id);

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
  ): Promise<ActivityCatalogResponseDto> {
    const current = await this.getOrFail(id);
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

  async remove(id: string): Promise<void> {
    const current = await this.getOrFail(id);
    await this.repository.remove(id);
    await this.photos.discard(current.photoUrl);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`ActivityCatalog with id "${id}" not found`);
    }

    return found;
  }
}
