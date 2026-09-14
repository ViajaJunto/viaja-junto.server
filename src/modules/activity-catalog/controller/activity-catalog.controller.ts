import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateActivityCatalogDto } from '../dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from '../dto/update-activity-catalog.dto.js';

@ApiTags('Activity Catalog')
@Controller('activity-catalog')
export class ActivityCatalogController {
  @ApiOperation({ summary: 'List activity catalog entries' })
  @Get()
  findAll() { return { success: true, data: [{ id: 'activity-catalog-1', name: 'City Tour', type: 'TOUR', city: 'Paris' }] }; }

  @ApiOperation({ summary: 'Get an activity catalog entry' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) { return { success: true, data: { id, name: 'City Tour', type: 'TOUR', city: 'Paris' } }; }

  @ApiOperation({ summary: 'Create an activity catalog entry' })
  @ApiBody({ type: CreateActivityCatalogDto })
  @Post()
  create(@Body() data: CreateActivityCatalogDto) { return { success: true, data: { id: 'mock-activity-catalog-id', ...data } }; }

  @ApiOperation({ summary: 'Update an activity catalog entry' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateActivityCatalogDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateActivityCatalogDto) { return { success: true, data: { id, ...data } }; }

  @ApiOperation({ summary: 'Delete an activity catalog entry' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  remove(@Param('id') id: string) { return { success: true, data: { id } }; }
}
