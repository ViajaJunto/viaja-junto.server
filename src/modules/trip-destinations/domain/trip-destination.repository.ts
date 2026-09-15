import { TripDestination } from './trip-destination.entity.js';

export type CreateTripDestinationData = Omit<TripDestination, 'id'>;
export type UpdateTripDestinationData = Partial<CreateTripDestinationData>;

/**
 * Contrato de persistencia do agregado TripDestination.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class TripDestinationRepository {
  abstract findAll(): Promise<TripDestination[]>;
  abstract findById(id: string): Promise<TripDestination | null>;
  abstract create(data: CreateTripDestinationData): Promise<TripDestination>;
  abstract update(id: string, data: UpdateTripDestinationData): Promise<TripDestination>;
  abstract remove(id: string): Promise<void>;
}
