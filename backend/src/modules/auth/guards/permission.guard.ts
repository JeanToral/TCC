// ─────────────────────── Imports ────────────────────────
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { PERMISSION_KEY } from '../../../common/decorators/requires-permission.decorator';

// ─────────────────────── Types ───────────────────────────
interface AuthUser {
  readonly permissions: string[];
}

// ─────────────────────── Guard ───────────────────────────
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext<{ req: { user?: AuthUser } }>().req.user;

    if (!user) return false;

    const { permissions } = user;
    if (permissions.includes('*')) return true;
    return permissions.includes(required);
  }
}
