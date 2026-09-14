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
import { CreateTripDto } from '../dto/create-trip.dto.js';
import { UpdateTripDto } from '../dto/update-trip.dto.js';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  @ApiOperation({ summary: 'List all trips' })
  @Get()
  findAll() {
    return {
      success: true,
      message: 'Mock list of trips',
      data: [
        {
          id: 'trip-1',
          name: 'Example Trip',
          status: 'PLANNING',
        },
      ],
    };
  }

  @ApiOperation({ summary: 'Get a trip by id' })
  @ApiParam({ name: 'id', description: 'Trip identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock trip details',
      data: {
        id,
        name: 'Example Trip',
        status: 'PLANNING',
      },
    };
  }

  @ApiOperation({ summary: 'Create a trip' })
  @ApiBody({ type: CreateTripDto })
  @Post()
  create(@Body() createTripDto: CreateTripDto) {
    return {
      success: true,
      message: 'Mock trip created',
      data: {
        id: 'mock-trip-id',
        ...createTripDto,
      },
    };
  }

  @ApiOperation({ summary: 'Update a trip' })
  @ApiParam({ name: 'id', description: 'Trip identifier' })
  @ApiBody({ type: UpdateTripDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto) {
    return {
      success: true,
      message: 'Mock trip updated',
      data: {
        id,
        ...updateTripDto,
      },
    };
  }

  @ApiOperation({ summary: 'Delete a trip' })
  @ApiParam({ name: 'id', description: 'Trip identifier' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock trip removed',
      data: { id },
    };
  }
}
