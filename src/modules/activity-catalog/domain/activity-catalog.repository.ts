import { ActivityCatalog } from './activity-catalog.entity.js';

export type CreateActivityCatalogData = Omit<ActivityCatalog, 'id' | 'createdAt'>;
export type UpdateActivityCatalogData = Partial<CreateActivityCatalogData>;

/**
 * Contrato de persistencia do agregado ActivityCatalog.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class ActivityCatalogRepository {
  abstract findAll(): Promise<ActivityCatalog[]>;
  abstract findById(id: string): Promise<ActivityCatalog | null>;
  abstract create(data: CreateActivityCatalogData): Promise<ActivityCatalog>;
  abstract update(id: string, data: UpdateActivityCatalogData): Promise<ActivityCatalog>;
  abstract remove(id: string): Promise<void>;
}
