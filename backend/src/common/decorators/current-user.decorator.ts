// ─────────────────────── Imports ────────────────────────
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

// ─────────────────────── Decorator ──────────────────────
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: { user: unknown } }>().req.user;
  },
);
