import { TripMember } from './trip-member.entity.js';

export type CreateTripMemberData = Omit<TripMember, 'id' | 'joinedAt'>;
export type UpdateTripMemberData = Partial<CreateTripMemberData>;

/**
 * Contrato de persistencia do agregado TripMember.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class TripMemberRepository {
  abstract findAll(): Promise<TripMember[]>;
  abstract findById(id: string): Promise<TripMember | null>;
  abstract create(data: CreateTripMemberData): Promise<TripMember>;
  abstract update(id: string, data: UpdateTripMemberData): Promise<TripMember>;
  abstract remove(id: string): Promise<void>;
}
