// ─────────────────────── Imports ────────────────────────
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { getRequestFromContext } from '../../modules/auth/guards/jwt.guard';

// ─────────────────────── Decorator ──────────────────────
/** Usuário autenticado — funciona em resolvers GraphQL e em controllers REST. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    getRequestFromContext<{ user: unknown }>(context).user,
);
