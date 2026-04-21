// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GqlThrottlerGuard } from '../../common/guards/gql-throttler.guard';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth-payload.type';
import { LoginInput } from './dto/login.input';
import { JwtAuthGuard } from './guards/jwt.guard';
import type { JwtUser } from './jwt.strategy';

// ─────────────────────── Resolver ────────────────────────
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(
    @Args('input') input: LoginInput,
    @Context() context: { res: Response },
  ): Promise<AuthPayload> {
    return this.authService.login(input, context.res);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: JwtUser,
    @Context() context: { res: Response },
  ): Promise<boolean> {
    return this.authService.logout(user.id, context.res);
  }

  @Mutation(() => AuthPayload)
  refreshToken(@Context() context: { req: Request }): Promise<AuthPayload> {
    return this.authService.refreshToken(context.req);
  }
}
