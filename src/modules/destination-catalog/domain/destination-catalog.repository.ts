import { DestinationCatalog } from './destination-catalog.entity.js';

export type CreateDestinationCatalogData = Omit<DestinationCatalog, 'id'>;
export type UpdateDestinationCatalogData = Partial<CreateDestinationCatalogData>;

/**
 * Contrato de persistencia do agregado DestinationCatalog.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class DestinationCatalogRepository {
  abstract findAll(): Promise<DestinationCatalog[]>;
  abstract findById(id: string): Promise<DestinationCatalog | null>;
  abstract create(data: CreateDestinationCatalogData): Promise<DestinationCatalog>;
  abstract update(id: string, data: UpdateDestinationCatalogData): Promise<DestinationCatalog>;
  abstract remove(id: string): Promise<void>;
}
