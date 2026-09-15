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
import { CreateTripActivityDto } from '../application/dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from '../application/dto/update-trip-activity.dto.js';
import { TripActivitiesService } from '../application/trip-activities.service.js';

@ApiTags('Trip Activities')
@Controller('trip-activities')
export class TripActivitiesController {
  constructor(private readonly service: TripActivitiesService) {}

  @ApiOperation({ summary: 'List all trip-activities' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one trip-activities entry by id' })
  @ApiParam({ name: 'id', description: 'TripActivity identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new trip-activities entry' })
  @ApiBody({ type: CreateTripActivityDto })
  @Post()
  create(@Body() dto: CreateTripActivityDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a trip-activities entry' })
  @ApiParam({ name: 'id', description: 'TripActivity identifier' })
  @ApiBody({ type: UpdateTripActivityDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripActivityDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a trip-activities entry' })
  @ApiParam({ name: 'id', description: 'TripActivity identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
