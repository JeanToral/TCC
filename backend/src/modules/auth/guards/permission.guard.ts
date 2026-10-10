// ─────────────────────── Imports ────────────────────────
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSION_KEY } from '../../../common/decorators/requires-permission.decorator';
import { getRequestFromContext } from './jwt.guard';

// ─────────────────────── Types ───────────────────────────
interface AuthUser {
  readonly permissions: string[];
}

// ─────────────────────── Helper ──────────────────────────
/**
 * Regra única de autorização: o wildcard do Sysadmin passa em tudo.
 * Exportada para uso em field resolvers, que precisam devolver `null` em vez de
 * lançar ForbiddenException e derrubar a query inteira.
 */
export function hasPermission(permissions: readonly string[], required: string): boolean {
  if (permissions.includes('*')) return true;
  return permissions.includes(required);
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

    const user = getRequestFromContext<{ user?: AuthUser }>(context).user;

    if (!user) return false;

    return hasPermission(user.permissions, required);
  }
}
