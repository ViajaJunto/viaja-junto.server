import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../domain/user.entity.js';
import { UserRepository } from '../domain/user.repository.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UserRepository) {}

  findAll(): Promise<User[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateUserDto): Promise<User> {
    return this.repository.create({
      name: dto.name,
      email: dto.email,
      // TODO: trocar por hash real (bcrypt/argon2) quando a autenticacao for implementada
      passwordHash: dto.password,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
