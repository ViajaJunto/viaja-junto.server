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
import { CreateDestinationCatalogDto } from '../application/dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from '../application/dto/update-destination-catalog.dto.js';
import { DestinationCatalogService } from '../application/destination-catalog.service.js';

@ApiTags('Destination Catalog')
@Controller('destination-catalog')
export class DestinationCatalogController {
  constructor(private readonly service: DestinationCatalogService) {}

  @ApiOperation({ summary: 'List all destination-catalog' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one destination-catalog entry by id' })
  @ApiParam({ name: 'id', description: 'DestinationCatalog identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new destination-catalog entry' })
  @ApiBody({ type: CreateDestinationCatalogDto })
  @Post()
  create(@Body() dto: CreateDestinationCatalogDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a destination-catalog entry' })
  @ApiParam({ name: 'id', description: 'DestinationCatalog identifier' })
  @ApiBody({ type: UpdateDestinationCatalogDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDestinationCatalogDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a destination-catalog entry' })
  @ApiParam({ name: 'id', description: 'DestinationCatalog identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
