import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWT_STRATEGY } from '../../infrastructure/jwt.strategy.js';

/**
 * Requires `Authorization: Bearer <token>`; answers 401 otherwise.
 * The decoded caller is available through the @CurrentUser() decorator.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY) {}
