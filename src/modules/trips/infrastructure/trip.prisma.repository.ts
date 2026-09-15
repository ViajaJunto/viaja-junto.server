import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { Trip } from '../domain/trip.entity.js';
import {
  CreateTripData,
  UpdateTripData,
  TripRepository,
} from '../domain/trip.repository.js';

@Injectable()
export class TripPrismaRepository implements TripRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Trip[]> {
    return this.prisma.trip.findMany();
  }

  findById(id: string): Promise<Trip | null> {
    return this.prisma.trip.findUnique({ where: { id } });
  }

  create(data: CreateTripData): Promise<Trip> {
    return this.prisma.trip.create({ data });
  }

  update(id: string, data: UpdateTripData): Promise<Trip> {
    return this.prisma.trip.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.trip.delete({ where: { id } });
  }
}
