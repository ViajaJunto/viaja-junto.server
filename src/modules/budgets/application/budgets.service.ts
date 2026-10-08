import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { BudgetRepository } from '../domain/budget.repository.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';
import { BudgetResponseDto } from './dto/budget-response.dto.js';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly repository: BudgetRepository,
    private readonly access: TripAccessService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<BudgetResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
    );

    return {
      data: items.map((item) => BudgetResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<BudgetResponseDto> {
    const budget = await this.getOrFail(id);
    await this.access.assertCanRead(budget.tripId, user.id);

    return BudgetResponseDto.from(budget);
  }

  async create(
    dto: CreateBudgetDto,
    user: AuthenticatedUser,
  ): Promise<BudgetResponseDto> {
    await this.access.assertCanEdit(dto.tripId, user.id);

    return BudgetResponseDto.from(
      await this.repository.create({
        ...dto,
        plannedActivities: dto.plannedActivities ?? 0,
      }),
    );
  }

  async update(
    id: string,
    dto: UpdateBudgetDto,
    user: AuthenticatedUser,
  ): Promise<BudgetResponseDto> {
    const budget = await this.getOrFail(id);
    await this.access.assertCanEdit(budget.tripId, user.id);

    return BudgetResponseDto.from(await this.repository.update(id, { ...dto }));
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const budget = await this.getOrFail(id);
    await this.access.assertCanEdit(budget.tripId, user.id);
    await this.repository.remove(id);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`Budget with id "${id}" not found`);
    }

    return found;
  }
}
