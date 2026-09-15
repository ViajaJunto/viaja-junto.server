import { User } from './user.entity.js';

export type CreateUserData = Omit<User, 'id' | 'createdAt'>;
export type UpdateUserData = Partial<CreateUserData>;

/**
 * Contrato de persistencia do agregado User.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class UserRepository {
  abstract findAll(): Promise<User[]>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(data: CreateUserData): Promise<User>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
  abstract remove(id: string): Promise<void>;
}
