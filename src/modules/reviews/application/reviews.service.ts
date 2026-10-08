import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { ReviewRepository } from '../domain/review.repository.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ReviewResponseDto } from './dto/review-response.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly repository: ReviewRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ReviewResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => ReviewResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(await this.getOrFail(id));
  }

  /** The author is always the authenticated caller, never taken from the payload. */
  async create(
    dto: CreateReviewDto,
    user: AuthenticatedUser,
  ): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(
      await this.repository.create({ ...dto, userId: user.id }),
    );
  }

  async update(
    id: string,
    dto: UpdateReviewDto,
    user: AuthenticatedUser,
  ): Promise<ReviewResponseDto> {
    await this.getOwnedOrFail(id, user);

    return ReviewResponseDto.from(await this.repository.update(id, { ...dto }));
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
      throw new NotFoundException(`Review with id "${id}" not found`);
    }

    return found;
  }
}
