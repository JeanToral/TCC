// ─────────────────────── Imports ────────────────────────
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext, type GqlContextType } from '@nestjs/graphql';

// ─────────────────────── Helper ──────────────────────────
/**
 * Extrai o request tanto de resolvers GraphQL quanto de controllers REST.
 * A exportação de planilhas é REST (ADR 0002); sem isto, o guard quebraria com
 * TypeError — um 500 em vez de um 401.
 */
export function getRequestFromContext<T>(context: ExecutionContext): T {
  if (context.getType<GqlContextType>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext<{ req: T }>().req;
  }
  return context.switchToHttp().getRequest<T>();
}

// ─────────────────────── Guard ───────────────────────────
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return getRequestFromContext<Request>(context);
  }

  handleRequest<T>(err: Error | null, user: T): T {
    if (err || !user) throw err ?? new UnauthorizedException();
    return user;
  }
}
