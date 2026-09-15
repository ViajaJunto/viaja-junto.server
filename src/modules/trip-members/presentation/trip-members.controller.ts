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
import { CreateTripMemberDto } from '../application/dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from '../application/dto/update-trip-member.dto.js';
import { TripMembersService } from '../application/trip-members.service.js';

@ApiTags('Trip Members')
@Controller('trip-members')
export class TripMembersController {
  constructor(private readonly service: TripMembersService) {}

  @ApiOperation({ summary: 'List all trip-members' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one trip-members entry by id' })
  @ApiParam({ name: 'id', description: 'TripMember identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new trip-members entry' })
  @ApiBody({ type: CreateTripMemberDto })
  @Post()
  create(@Body() dto: CreateTripMemberDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a trip-members entry' })
  @ApiParam({ name: 'id', description: 'TripMember identifier' })
  @ApiBody({ type: UpdateTripMemberDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripMemberDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a trip-members entry' })
  @ApiParam({ name: 'id', description: 'TripMember identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
