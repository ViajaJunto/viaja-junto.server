import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateTripActivityDto } from '../dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from '../dto/update-trip-activity.dto.js';

@ApiTags('Trip Activities')
@Controller('trip-activities')
export class TripActivitiesController {
  @ApiOperation({ summary: 'List activities assigned to trip destinations' })
  @Get()
  findAll() { return { success: true, data: [{ id: 'trip-activity-1', tripDestinationId: 'trip-destination-1', activityCatalogId: 'activity-catalog-1', status: 'PENDING' }] }; }

  @ApiOperation({ summary: 'Get a trip activity' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) { return { success: true, data: { id, tripDestinationId: 'trip-destination-1', activityCatalogId: 'activity-catalog-1', status: 'PENDING' } }; }

  @ApiOperation({ summary: 'Assign an activity to a trip destination' })
  @ApiBody({ type: CreateTripActivityDto })
  @Post()
  create(@Body() data: CreateTripActivityDto) { return { success: true, data: { id: 'mock-trip-activity-id', ...data } }; }

  @ApiOperation({ summary: 'Update a trip activity' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateTripActivityDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateTripActivityDto) { return { success: true, data: { id, ...data } }; }

  @ApiOperation({ summary: 'Remove an activity from a trip destination' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  remove(@Param('id') id: string) { return { success: true, data: { id } }; }
}
