import { Injectable } from '@nestjs/common';
import { CreateBudgetDto } from '../dto/create-budget.dto.js';
import { UpdateBudgetDto } from '../dto/update-budget.dto.js';

@Injectable()
export class BudgetsService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id, message: 'Budget mock response' };
  }

  create(createBudgetDto: CreateBudgetDto) {
    return {
      id: 'mock-budget-id',
      ...createBudgetDto,
      message: 'Budget created mock response',
    };
  }

  update(id: string, updateBudgetDto: UpdateBudgetDto) {
    return {
      id,
      ...updateBudgetDto,
      message: 'Budget updated mock response',
    };
  }

  remove(id: string) {
    return {
      id,
      message: 'Budget removed mock response',
    };
  }
}
