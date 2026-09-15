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
import { CreateActivityCatalogDto } from '../application/dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from '../application/dto/update-activity-catalog.dto.js';
import { ActivityCatalogService } from '../application/activity-catalog.service.js';

@ApiTags('Activity Catalog')
@Controller('activity-catalog')
export class ActivityCatalogController {
  constructor(private readonly service: ActivityCatalogService) {}

  @ApiOperation({ summary: 'List all activity-catalog' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one activity-catalog entry by id' })
  @ApiParam({ name: 'id', description: 'ActivityCatalog identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new activity-catalog entry' })
  @ApiBody({ type: CreateActivityCatalogDto })
  @Post()
  create(@Body() dto: CreateActivityCatalogDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a activity-catalog entry' })
  @ApiParam({ name: 'id', description: 'ActivityCatalog identifier' })
  @ApiBody({ type: UpdateActivityCatalogDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityCatalogDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a activity-catalog entry' })
  @ApiParam({ name: 'id', description: 'ActivityCatalog identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
