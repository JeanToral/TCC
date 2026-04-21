// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { GqlThrottlerGuard } from '../../common/guards/gql-throttler.guard';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { PermissionGuard } from './guards/permission.guard';
import { JwtStrategy } from './jwt.strategy';

// ─────────────────────── Types ───────────────────────────
type JwtDuration = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRATION') as JwtDuration,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    AuthResolver,
    JwtStrategy,
    JwtAuthGuard,
    PermissionGuard,
    GqlThrottlerGuard,
  ],
  exports: [JwtAuthGuard, PermissionGuard, JwtModule],
})
export class AuthModule {}
