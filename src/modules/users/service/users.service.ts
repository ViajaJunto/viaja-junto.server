import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';

@Injectable()
export class UsersService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id, message: 'User mock response' };
  }

  create(createUserDto: CreateUserDto) {
    return {
      id: 'mock-user-id',
      ...createUserDto,
      message: 'User created mock response',
    };
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return {
      id,
      ...updateUserDto,
      message: 'User updated mock response',
    };
  }

  remove(id: string) {
    return {
      id,
      message: 'User removed mock response',
    };
  }
}
