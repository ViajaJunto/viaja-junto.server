import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateTripDestinationDto } from '../dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from '../dto/update-trip-destination.dto.js';

@ApiTags('Trip Destinations')
@Controller('trip-destinations')
export class TripDestinationsController {
  @ApiOperation({ summary: 'List destinations assigned to trips' })
  @Get()
  findAll() { return { success: true, data: [{ id: 'trip-destination-1', tripId: 'trip-1', destinationCatalogId: 'destination-catalog-1', order: 1 }] }; }

  @ApiOperation({ summary: 'Get a trip destination' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) { return { success: true, data: { id, tripId: 'trip-1', destinationCatalogId: 'destination-catalog-1', order: 1 } }; }

  @ApiOperation({ summary: 'Assign a destination to a trip' })
  @ApiBody({ type: CreateTripDestinationDto })
  @Post()
  create(@Body() data: CreateTripDestinationDto) { return { success: true, data: { id: 'mock-trip-destination-id', ...data } }; }

  @ApiOperation({ summary: 'Update a trip destination' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateTripDestinationDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateTripDestinationDto) { return { success: true, data: { id, ...data } }; }

  @ApiOperation({ summary: 'Remove a destination from a trip' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  remove(@Param('id') id: string) { return { success: true, data: { id } }; }
}
