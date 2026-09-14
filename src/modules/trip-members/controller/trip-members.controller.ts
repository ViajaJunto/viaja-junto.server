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
import { CreateTripMemberDto } from '../dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from '../dto/update-trip-member.dto.js';

@ApiTags('Trip Members')
@Controller('trip-members')
export class TripMembersController {
  @ApiOperation({ summary: 'List all trip members' })
  @Get()
  findAll() {
    return {
      success: true,
      message: 'Mock list of trip members',
      data: [
        {
          id: 'member-1',
          tripId: 'trip-1',
          userId: 'user-1',
          permission: 'EDITOR',
        },
      ],
    };
  }

  @ApiOperation({ summary: 'Get a trip member by id' })
  @ApiParam({ name: 'id', description: 'Trip member identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock trip member details',
      data: {
        id,
        tripId: 'trip-1',
        userId: 'user-1',
        permission: 'EDITOR',
      },
    };
  }

  @ApiOperation({ summary: 'Create a trip member' })
  @ApiBody({ type: CreateTripMemberDto })
  @Post()
  create(@Body() createTripMemberDto: CreateTripMemberDto) {
    return {
      success: true,
      message: 'Mock trip member created',
      data: {
        id: 'mock-trip-member-id',
        ...createTripMemberDto,
      },
    };
  }

  @ApiOperation({ summary: 'Update a trip member' })
  @ApiParam({ name: 'id', description: 'Trip member identifier' })
  @ApiBody({ type: UpdateTripMemberDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTripMemberDto: UpdateTripMemberDto) {
    return {
      success: true,
      message: 'Mock trip member updated',
      data: {
        id,
        ...updateTripMemberDto,
      },
    };
  }

  @ApiOperation({ summary: 'Delete a trip member' })
  @ApiParam({ name: 'id', description: 'Trip member identifier' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock trip member removed',
      data: { id },
    };
  }
}
