import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { LoginInput } from './dto/login.input';
import type { AuthPayload } from './dto/auth-payload.type';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly config;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService);
    login(input: LoginInput, res: Response): Promise<AuthPayload>;
    logout(userId: number, res: Response): Promise<boolean>;
    refreshToken(req: Request): Promise<AuthPayload>;
    private signAccess;
    private signRefresh;
    private setRefreshCookie;
}
