import { Module } from '@nestjs/common';
import { BudgetsController } from './controller/budgets.controller.js';
import { BudgetsService } from './service/budgets.service.js';

@Module({
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetModule {}
