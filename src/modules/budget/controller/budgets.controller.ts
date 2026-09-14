import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateBudgetDto } from '../dto/create-budget.dto.js';
import { UpdateBudgetDto } from '../dto/update-budget.dto.js';

@ApiTags('Budgets')
@Controller('budgets')
export class BudgetsController {
  @ApiOperation({ summary: 'List all budgets' })
  @Get()
  findAll() {
    return {
      success: true,
      message: 'Mock list of budgets',
      data: [
        {
          id: 'budget-1',
          tripId: 'trip-1',
          totalValue: 2500,
          plannedActivities: 1200,
        },
      ],
    };
  }

  @ApiOperation({ summary: 'Get a budget by id' })
  @ApiParam({ name: 'id', description: 'Budget identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock budget details',
      data: {
        id,
        tripId: 'trip-1',
        totalValue: 2500,
        plannedActivities: 1200,
      },
    };
  }

  @ApiOperation({ summary: 'Create a budget' })
  @ApiBody({ type: CreateBudgetDto })
  @Post()
  create(@Body() createBudgetDto: CreateBudgetDto) {
    return {
      success: true,
      message: 'Mock budget created',
      data: {
        id: 'mock-budget-id',
        ...createBudgetDto,
      },
    };
  }

  @ApiOperation({ summary: 'Update a budget' })
  @ApiParam({ name: 'id', description: 'Budget identifier' })
  @ApiBody({ type: UpdateBudgetDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBudgetDto: UpdateBudgetDto) {
    return {
      success: true,
      message: 'Mock budget updated',
      data: {
        id,
        ...updateBudgetDto,
      },
    };
  }

  @ApiOperation({ summary: 'Delete a budget' })
  @ApiParam({ name: 'id', description: 'Budget identifier' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock budget removed',
      data: { id },
    };
  }
}
