import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { env } from '../../shared/config/env.js';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './application/auth.service.js';
import { AccessTokenIssuer } from './domain/access-token.issuer.js';
import { GoogleStrategy } from './infrastructure/google.strategy.js';
import { JwtAccessTokenIssuer } from './infrastructure/jwt-access-token.issuer.js';
import { JwtStrategy } from './infrastructure/jwt.strategy.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  imports: [
    UsersModule,
    // Stateless API: no server-side session, the JWT is the session.
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: AccessTokenIssuer, useClass: JwtAccessTokenIssuer },
  ],
  // PassportModule is re-exported so a feature module can use JwtAuthGuard
  // just by importing AuthModule.
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
