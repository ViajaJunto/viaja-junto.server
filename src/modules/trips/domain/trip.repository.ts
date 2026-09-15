import { Trip } from './trip.entity.js';

export type CreateTripData = Omit<Trip, 'id' | 'createdAt'>;
export type UpdateTripData = Partial<CreateTripData>;

/**
 * Contrato de persistencia do agregado Trip.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class TripRepository {
  abstract findAll(): Promise<Trip[]>;
  abstract findById(id: string): Promise<Trip | null>;
  abstract create(data: CreateTripData): Promise<Trip>;
  abstract update(id: string, data: UpdateTripData): Promise<Trip>;
  abstract remove(id: string): Promise<void>;
}
