import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateBudgetDto } from '../application/dto/create-budget.dto.js';
import { UpdateBudgetDto } from '../application/dto/update-budget.dto.js';
import { BudgetsService } from '../application/budgets.service.js';

@ApiTags('Budgets')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @ApiOperation({ summary: 'List all budgets' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one budgets entry by id' })
  @ApiParam({ name: 'id', description: 'Budget identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new budgets entry' })
  @ApiBody({ type: CreateBudgetDto })
  @Post()
  create(@Body() dto: CreateBudgetDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a budgets entry' })
  @ApiParam({ name: 'id', description: 'Budget identifier' })
  @ApiBody({ type: UpdateBudgetDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a budgets entry' })
  @ApiParam({ name: 'id', description: 'Budget identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
