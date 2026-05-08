// ─────────────────────── Imports ────────────────────────
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';
import type { LoginInput } from './dto/login.input';
import type { AuthPayload } from './dto/auth-payload.type';

// ─────────────────────── Types ───────────────────────────
type JwtDuration = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

interface AccessPayload {
  readonly sub: string;
  readonly email: string;
  readonly permissions: string[];
}

// ─────────────────────── Service ────────────────────────
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginInput, res: Response): Promise<AuthPayload> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        deletedAt: true,
        roleId: true,
        role: { select: { permissions: true } },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const permissions = user.role.permissions as string[];
    const accessToken = await this.signAccess({ sub: String(user.id), email: user.email, permissions });
    const refreshToken = await this.signRefresh(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
    });

    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  async logout(userId: number, res: Response): Promise<boolean> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    res.clearCookie('refreshToken');
    return true;
  }

  async refreshToken(req: Request): Promise<AuthPayload> {
    const token: string =
      (req.cookies as Record<string, string> | undefined)?.refreshToken ?? '';

    if (!token) throw new UnauthorizedException();

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: {
        id: true,
        email: true,
        isActive: true,
        deletedAt: true,
        roleId: true,
        refreshTokenHash: true,
        role: { select: { permissions: true } },
      },
    });

    if (!user || !user.isActive || user.deletedAt || !user.refreshTokenHash) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(token, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException();

    const permissions = user.role.permissions as string[];
    const accessToken = await this.signAccess({ sub: String(user.id), email: user.email, permissions });
    const newRefresh = await this.signRefresh(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(newRefresh, 10) },
    });

    return { accessToken };
  }

  private signAccess(payload: AccessPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  private signRefresh(userId: number): Promise<string> {
    return this.jwtService.signAsync(
      { sub: String(userId) },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_EXPIRATION') as JwtDuration,
      },
    );
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
