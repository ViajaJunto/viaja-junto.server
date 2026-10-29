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
  DestinationCatalogRepository,
  CreateDestinationCatalogData,
} from '../domain/destination-catalog.repository.js';
import { TopDestinationResponseDto } from './dto/top-destination-response.dto.js';
import { ListDestinationCatalogQueryDto } from './dto/list-destination-catalog-query.dto.js';
import { CreateDestinationCatalogDto } from './dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from './dto/update-destination-catalog.dto.js';
import { DestinationCatalogResponseDto } from './dto/destination-catalog-response.dto.js';

@Injectable()
export class DestinationCatalogService {
  constructor(
    private readonly repository: DestinationCatalogRepository,
    private readonly photos: PhotoStorageService,
    private readonly access: CatalogAccessService,
  ) {}

  async findAll(
    query: ListDestinationCatalogQueryDto,
  ): Promise<PaginatedResponseDto<DestinationCatalogResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      { text: query.q, country: query.country, category: query.category },
    );

    return {
      data: items.map((item) => DestinationCatalogResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  /** The best rated destinations, for the home page (FR25). */
  async findTop(limit: number): Promise<TopDestinationResponseDto[]> {
    return (await this.repository.findTopRated(limit)).map((destination) =>
      TopDestinationResponseDto.fromRated(destination),
    );
  }

  async findOne(id: string): Promise<DestinationCatalogResponseDto> {
    return DestinationCatalogResponseDto.from(await this.getOrFail(id));
  }

  async create(
    dto: CreateDestinationCatalogDto,
    user: AuthenticatedUser,
  ): Promise<DestinationCatalogResponseDto> {
    await this.access.assertAdmin(user.id);

    return DestinationCatalogResponseDto.from(
      await this.repository.create({ ...dto }),
    );
  }

  /**
   * Adds a place taken from the external provider. The external id is unique:
   * importing the same place twice answers 409 instead of duplicating it.
   */
  async importPlace(
    data: CreateDestinationCatalogData & { externalId: string },
    user: AuthenticatedUser,
  ): Promise<DestinationCatalogResponseDto> {
    await this.access.assertAdmin(user.id);

    if (
      (await this.repository.findExistingExternalIds([data.externalId]))
        .length > 0
    ) {
      throw new ConflictException('This place is already in the catalog');
    }

    return DestinationCatalogResponseDto.from(
      await this.repository.create(data),
    );
  }

  /** Which of these external ids are already in the catalog. */
  findImported(externalIds: string[]): Promise<string[]> {
    return this.repository.findExistingExternalIds(externalIds);
  }

  async update(
    id: string,
    dto: UpdateDestinationCatalogDto,
    user: AuthenticatedUser,
  ): Promise<DestinationCatalogResponseDto> {
    await this.getOrFail(id);
    await this.access.assertAdmin(user.id);

    return DestinationCatalogResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  /** Uploads a new photo and points the record at it. */
  async updatePhoto(
    id: string,
    photo: UploadedPhoto,
    user: AuthenticatedUser,
  ): Promise<DestinationCatalogResponseDto> {
    const current = await this.getOrFail(id);
    await this.access.assertAdmin(user.id);
    const updated = await this.photos.replace({
      folder: 'destinations',
      ownerId: id,
      photo,
      previousUrl: current.photoUrl,
      save: (photoUrl) => this.repository.update(id, { photoUrl }),
    });

    return DestinationCatalogResponseDto.from(updated);
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
      throw new NotFoundException(
        `DestinationCatalog with id "${id}" not found`,
      );
    }

    return found;
  }
}
