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
import { CreateTripDestinationDto } from '../application/dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from '../application/dto/update-trip-destination.dto.js';
import { TripDestinationsService } from '../application/trip-destinations.service.js';

@ApiTags('Trip Destinations')
@Controller('trip-destinations')
export class TripDestinationsController {
  constructor(private readonly service: TripDestinationsService) {}

  @ApiOperation({ summary: 'List all trip-destinations' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one trip-destinations entry by id' })
  @ApiParam({ name: 'id', description: 'TripDestination identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new trip-destinations entry' })
  @ApiBody({ type: CreateTripDestinationDto })
  @Post()
  create(@Body() dto: CreateTripDestinationDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a trip-destinations entry' })
  @ApiParam({ name: 'id', description: 'TripDestination identifier' })
  @ApiBody({ type: UpdateTripDestinationDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripDestinationDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a trip-destinations entry' })
  @ApiParam({ name: 'id', description: 'TripDestination identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
