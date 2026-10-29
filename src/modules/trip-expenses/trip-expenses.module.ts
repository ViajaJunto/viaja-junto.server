import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripAccessModule } from '../trip-access/trip-access.module.js';
import { TripExpensesService } from './application/trip-expenses.service.js';
import { TripExpenseRepository } from './domain/trip-expense.repository.js';
import { TripExpensePrismaRepository } from './infrastructure/trip-expense.prisma.repository.js';
import {
  TripExpenseSummaryController,
  TripExpensesController,
} from './presentation/trip-expenses.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule],
  controllers: [TripExpensesController, TripExpenseSummaryController],
  providers: [
    TripExpensesService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: TripExpenseRepository, useClass: TripExpensePrismaRepository },
  ],
  exports: [TripExpensesService],
})
export class TripExpensesModule {}
