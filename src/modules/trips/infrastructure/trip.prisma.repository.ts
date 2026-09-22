import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
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

  async findAll({ skip, take }: PageRequest): Promise<Page<Trip>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.trip.count(),
    ]);

    return { items, total };
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
