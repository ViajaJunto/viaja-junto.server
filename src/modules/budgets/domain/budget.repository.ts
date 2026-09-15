import { Budget } from './budget.entity.js';

export type CreateBudgetData = Omit<Budget, 'id' | 'createdAt'>;
export type UpdateBudgetData = Partial<CreateBudgetData>;

/**
 * Contrato de persistencia do agregado Budget.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class BudgetRepository {
  abstract findAll(): Promise<Budget[]>;
  abstract findById(id: string): Promise<Budget | null>;
  abstract create(data: CreateBudgetData): Promise<Budget>;
  abstract update(id: string, data: UpdateBudgetData): Promise<Budget>;
  abstract remove(id: string): Promise<void>;
}
