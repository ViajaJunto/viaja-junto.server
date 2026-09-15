import { Injectable, NotFoundException } from '@nestjs/common';
import { Budget } from '../domain/budget.entity.js';
import { BudgetRepository } from '../domain/budget.repository.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';

@Injectable()
export class BudgetsService {
  constructor(private readonly repository: BudgetRepository) {}

  findAll(): Promise<Budget[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Budget> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`Budget with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateBudgetDto): Promise<Budget> {
    return this.repository.create({ ...dto, plannedActivities: dto.plannedActivities ?? 0 });
  }

  async update(id: string, dto: UpdateBudgetDto): Promise<Budget> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
