// ─────────────────────── Imports ────────────────────────
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request, Response } from 'express';

// ─────────────────────── Guard ───────────────────────────
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(
    context: ExecutionContext,
  ): { req: Request; res: Response } {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext<{ req: Request; res: Response }>();
  }
}
