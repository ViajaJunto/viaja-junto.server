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
import { CreateUserDto } from '../application/dto/create-user.dto.js';
import { UpdateUserDto } from '../application/dto/update-user.dto.js';
import { UsersService } from '../application/users.service.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @ApiOperation({ summary: 'List all users' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one users entry by id' })
  @ApiParam({ name: 'id', description: 'User identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new users entry' })
  @ApiBody({ type: CreateUserDto })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a users entry' })
  @ApiParam({ name: 'id', description: 'User identifier' })
  @ApiBody({ type: UpdateUserDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a users entry' })
  @ApiParam({ name: 'id', description: 'User identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
