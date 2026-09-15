import { TripActivity } from './trip-activity.entity.js';

export type CreateTripActivityData = Omit<TripActivity, 'id'>;
export type UpdateTripActivityData = Partial<CreateTripActivityData>;

/**
 * Contrato de persistencia do agregado TripActivity.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class TripActivityRepository {
  abstract findAll(): Promise<TripActivity[]>;
  abstract findById(id: string): Promise<TripActivity | null>;
  abstract create(data: CreateTripActivityData): Promise<TripActivity>;
  abstract update(id: string, data: UpdateTripActivityData): Promise<TripActivity>;
  abstract remove(id: string): Promise<void>;
}
