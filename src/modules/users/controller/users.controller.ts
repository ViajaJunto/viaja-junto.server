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
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'List all users' })
  @Get()
  findAll() {
    return {
      success: true,
      message: 'Mock list of users',
      data: [
        {
          id: 'user-1',
          name: 'Example User',
          email: 'user@example.com',
        },
      ],
    };
  }

  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', description: 'User identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock user details',
      data: {
        id,
        name: 'Example User',
        email: 'user@example.com',
      },
    };
  }

  @ApiOperation({ summary: 'Create a user' })
  @ApiBody({ type: CreateUserDto })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return {
      success: true,
      message: 'Mock user created',
      data: {
        id: 'mock-user-id',
        ...createUserDto,
      },
    };
  }

  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User identifier' })
  @ApiBody({ type: UpdateUserDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return {
      success: true,
      message: 'Mock user updated',
      data: {
        id,
        ...updateUserDto,
      },
    };
  }

  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User identifier' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock user removed',
      data: { id },
    };
  }
}
