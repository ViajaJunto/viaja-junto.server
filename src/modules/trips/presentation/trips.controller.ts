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
import { CreateTripDto } from '../application/dto/create-trip.dto.js';
import { UpdateTripDto } from '../application/dto/update-trip.dto.js';
import { TripsService } from '../application/trips.service.js';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly service: TripsService) {}

  @ApiOperation({ summary: 'List all trips' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one trips entry by id' })
  @ApiParam({ name: 'id', description: 'Trip identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new trips entry' })
  @ApiBody({ type: CreateTripDto })
  @Post()
  create(@Body() dto: CreateTripDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a trips entry' })
  @ApiParam({ name: 'id', description: 'Trip identifier' })
  @ApiBody({ type: UpdateTripDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a trips entry' })
  @ApiParam({ name: 'id', description: 'Trip identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
