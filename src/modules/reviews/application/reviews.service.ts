import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
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

  async create(dto: CreateReviewDto): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(await this.repository.create({ ...dto }));
  }

  async update(id: string, dto: UpdateReviewDto): Promise<ReviewResponseDto> {
    await this.getOrFail(id);

    return ReviewResponseDto.from(await this.repository.update(id, { ...dto }));
  }

  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.repository.remove(id);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`Review with id "${id}" not found`);
    }

    return found;
  }
}
