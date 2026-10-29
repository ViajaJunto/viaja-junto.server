import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { DestinationReviewRepository } from '../domain/destination-review.repository.js';
import { ListDestinationReviewsQueryDto } from './dto/list-destination-reviews-query.dto.js';
import { CreateDestinationReviewDto } from './dto/create-destination-review.dto.js';
import { UpdateDestinationReviewDto } from './dto/update-destination-review.dto.js';
import { DestinationReviewResponseDto } from './dto/destination-review-response.dto.js';

@Injectable()
export class DestinationReviewsService {
  constructor(private readonly repository: DestinationReviewRepository) {}

  async findAll(
    query: ListDestinationReviewsQueryDto,
  ): Promise<PaginatedResponseDto<DestinationReviewResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      { destinationId: query.destinationId },
    );

    return {
      data: items.map((item) => DestinationReviewResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<DestinationReviewResponseDto> {
    return DestinationReviewResponseDto.from(await this.getOrFail(id));
  }

  /**
   * Only someone who completed a trip to the destination may review it
   * (BR05). The author is always the authenticated caller.
   */
  async create(
    dto: CreateDestinationReviewDto,
    user: AuthenticatedUser,
  ): Promise<DestinationReviewResponseDto> {
    if (!(await this.repository.destinationExists(dto.destinationId))) {
      throw new NotFoundException(
        `DestinationCatalog with id "${dto.destinationId}" not found`,
      );
    }
    if (
      !(await this.repository.hasCompletedTripTo(user.id, dto.destinationId))
    ) {
      throw new ForbiddenException(
        'Only travellers who completed a trip to this destination can review it',
      );
    }

    return DestinationReviewResponseDto.from(
      await this.repository.create({ ...dto, userId: user.id }),
    );
  }

  async update(
    id: string,
    dto: UpdateDestinationReviewDto,
    user: AuthenticatedUser,
  ): Promise<DestinationReviewResponseDto> {
    await this.getOwnedOrFail(id, user);

    return DestinationReviewResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.getOwnedOrFail(id, user);
    await this.repository.remove(id);
  }

  /** Only the author may change or delete a review. */
  private async getOwnedOrFail(id: string, user: AuthenticatedUser) {
    const found = await this.getOrFail(id);

    if (found.userId !== user.id) {
      throw new ForbiddenException('Only the author can change this review');
    }

    return found;
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(
        `Destination review with id "${id}" not found`,
      );
    }

    return found;
  }
}
