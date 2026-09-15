import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { TripActivity } from '../domain/trip-activity.entity.js';
import {
  CreateTripActivityData,
  UpdateTripActivityData,
  TripActivityRepository,
} from '../domain/trip-activity.repository.js';

@Injectable()
export class TripActivityPrismaRepository implements TripActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<TripActivity[]> {
    return this.prisma.tripActivity.findMany();
  }

  findById(id: string): Promise<TripActivity | null> {
    return this.prisma.tripActivity.findUnique({ where: { id } });
  }

  create(data: CreateTripActivityData): Promise<TripActivity> {
    return this.prisma.tripActivity.create({ data });
  }

  update(id: string, data: UpdateTripActivityData): Promise<TripActivity> {
    return this.prisma.tripActivity.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.tripActivity.delete({ where: { id } });
  }
}
