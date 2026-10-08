import { TripAccessModule } from '../trip-access/trip-access.module.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BudgetsService } from './application/budgets.service.js';
import { BudgetRepository } from './domain/budget.repository.js';
import { BudgetPrismaRepository } from './infrastructure/budget.prisma.repository.js';
import { BudgetsController } from './presentation/budgets.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule],
  controllers: [BudgetsController],
  providers: [
    BudgetsService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: BudgetRepository, useClass: BudgetPrismaRepository },
  ],
  exports: [BudgetsService],
})
export class BudgetsModule {}
