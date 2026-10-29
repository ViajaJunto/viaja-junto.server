import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CatalogAccessService } from '../../catalog-access/application/catalog-access.service.js';
import { PhotoStorageService } from '../../../shared/storage/application/photo-storage.service.js';
import type { UploadedPhoto } from '../../../shared/storage/domain/photo.js';
import {
  ActivityCatalogRepository,
  CreateActivityCatalogData,
} from '../domain/activity-catalog.repository.js';
import { ListActivityCatalogQueryDto } from './dto/list-activity-catalog-query.dto.js';
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
    query: ListActivityCatalogQueryDto,
  ): Promise<PaginatedResponseDto<ActivityCatalogResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      {
        text: query.q,
        type: query.type,
        minRating: query.minRating,
        city: query.city,
        country: query.country,
        sort: query.sort,
      },
    );

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

  /**
   * Adds a place taken from the external provider. The external id is unique:
   * importing the same place twice answers 409 instead of duplicating it.
   */
  async importPlace(
    data: CreateActivityCatalogData & { externalId: string },
    user: AuthenticatedUser,
  ): Promise<ActivityCatalogResponseDto> {
    await this.access.assertAdmin(user.id);

    if (
      (await this.repository.findExistingExternalIds([data.externalId]))
        .length > 0
    ) {
      throw new ConflictException('This place is already in the catalog');
    }

    return ActivityCatalogResponseDto.from(await this.repository.create(data));
  }

  /** Which of these external ids are already in the catalog. */
  findImported(externalIds: string[]): Promise<string[]> {
    return this.repository.findExistingExternalIds(externalIds);
  }

  async update(
    id: string,
    dto: UpdateActivityCatalogDto,
    user: AuthenticatedUser,
  ): Promise<ActivityCatalogResponseDto> {
    await this.getOrFail(id);
    await this.access.assertAdmin(user.id);

    return ActivityCatalogResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  /** Uploads a new photo and points the record at it. */
  async updatePhoto(
    id: string,
    photo: UploadedPhoto,
    user: AuthenticatedUser,
  ): Promise<ActivityCatalogResponseDto> {
    const current = await this.getOrFail(id);
    await this.access.assertAdmin(user.id);
    const updated = await this.photos.replace({
      folder: 'activities',
      ownerId: id,
      photo,
      previousUrl: current.photoUrl,
      save: (photoUrl) => this.repository.update(id, { photoUrl }),
    });

    return ActivityCatalogResponseDto.from(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const current = await this.getOrFail(id);
    await this.access.assertCanDelete(user.id, () =>
      this.repository.countTripUsages(id),
    );
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
