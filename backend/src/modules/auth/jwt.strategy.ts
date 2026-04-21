// ─────────────────────── Imports ────────────────────────
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
interface JwtPayload {
  readonly sub: string;
  readonly email: string;
}

export interface JwtUser {
  readonly id: number;
  readonly email: string;
  readonly roleId: number;
  readonly permissions: string[];
}

// ─────────────────────── Strategy ────────────────────────
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: parseInt(payload.sub, 10) },
      select: {
        id: true,
        email: true,
        isActive: true,
        deletedAt: true,
        roleId: true,
        role: { select: { permissions: true } },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      permissions: user.role.permissions as string[],
    };
  }
}
