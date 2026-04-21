import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth-payload.type';
import { LoginInput } from './dto/login.input';
import type { JwtUser } from './jwt.strategy';
export declare class AuthResolver {
    private readonly authService;
    constructor(authService: AuthService);
    login(input: LoginInput, context: {
        res: Response;
    }): Promise<AuthPayload>;
    logout(user: JwtUser, context: {
        res: Response;
    }): Promise<boolean>;
    refreshToken(context: {
        req: Request;
    }): Promise<AuthPayload>;
}
