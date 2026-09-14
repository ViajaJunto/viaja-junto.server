import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateDestinationCatalogDto } from '../dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from '../dto/update-destination-catalog.dto.js';

@ApiTags('Destination Catalog')
@Controller('destination-catalog')
export class DestinationCatalogController {
  @ApiOperation({ summary: 'List destination catalog entries' })
  @Get()
  findAll() { return { success: true, data: [{ id: 'destination-catalog-1', name: 'Paris', country: 'France' }] }; }

  @ApiOperation({ summary: 'Get a destination catalog entry' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) { return { success: true, data: { id, name: 'Paris', country: 'France' } }; }

  @ApiOperation({ summary: 'Create a destination catalog entry' })
  @ApiBody({ type: CreateDestinationCatalogDto })
  @Post()
  create(@Body() data: CreateDestinationCatalogDto) { return { success: true, data: { id: 'mock-destination-catalog-id', ...data } }; }

  @ApiOperation({ summary: 'Update a destination catalog entry' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateDestinationCatalogDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateDestinationCatalogDto) { return { success: true, data: { id, ...data } }; }

  @ApiOperation({ summary: 'Delete a destination catalog entry' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  remove(@Param('id') id: string) { return { success: true, data: { id } }; }
}
