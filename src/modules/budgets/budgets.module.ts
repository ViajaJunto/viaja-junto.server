import { Module } from '@nestjs/common';
import { BudgetsService } from './application/budgets.service.js';
import { BudgetRepository } from './domain/budget.repository.js';
import { BudgetPrismaRepository } from './infrastructure/budget.prisma.repository.js';
import { BudgetsController } from './presentation/budgets.controller.js';

@Module({
  controllers: [BudgetsController],
  providers: [
    BudgetsService,
    // Inversao de dependencia: a aplicacao depende do contrato do dominio,
    // e a infraestrutura fornece a implementacao concreta.
    { provide: BudgetRepository, useClass: BudgetPrismaRepository },
  ],
  exports: [BudgetsService],
})
export class BudgetsModule {}
