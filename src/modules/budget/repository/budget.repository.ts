import { CreateBudgetDto } from '../dto/create-budget.dto.js';
import { UpdateBudgetDto } from '../dto/update-budget.dto.js';
import { Budget } from '../model/budget.model.js';

export interface BudgetRepository {
  findAll(): Promise<Budget[]>;
  findById(id: string): Promise<Budget | null>;
  create(data: CreateBudgetDto): Promise<Budget>;
  update(id: string, data: UpdateBudgetDto): Promise<Budget>;
  remove(id: string): Promise<void>;
}
