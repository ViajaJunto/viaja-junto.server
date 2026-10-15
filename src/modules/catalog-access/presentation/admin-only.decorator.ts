import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiAuthenticated,
  ApiForbidden,
} from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';

/**
 * Marks a catalog write route: it needs a valid token (401) and the service
 * then checks the ADMIN role (403) through CatalogAccessService.
 */
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiAuthenticated(),
    ApiForbidden('Only an administrator can change the catalogs.'),
  );
