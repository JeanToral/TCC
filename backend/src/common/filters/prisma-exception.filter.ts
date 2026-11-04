// ─────────────────────── Imports ────────────────────────
import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  type ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';
import type { GraphQLFormattedError } from 'graphql';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma';

// ─────────────────────── Constants ──────────────────────
/** Campo único → mensagem. A ordem importa: chaves compostas antes das simples. */
const UNIQUE_MESSAGES: readonly (readonly [readonly string[], string])[] = [
  [['workOrderId', 'sparePartId'], 'Esta peça já está lançada nesta OS'],
  [['tag'], 'Já existe um ativo com esta tag'],
  [['partNumber'], 'Já existe uma peça com este código'],
  [['email'], 'Já existe um usuário com este e-mail'],
  [['name'], 'Já existe um perfil de acesso com este nome'],
];

const UNIQUE_FALLBACK = 'Já existe um registro com estes dados';

// ─────────────────────── Filter ─────────────────────────
/**
 * Traduz erros conhecidos do Prisma em exceções HTTP com mensagem para o usuário.
 * Sem ele, a mensagem bruta do Prisma (com nomes de tabela e query) chega à tela.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): HttpException | void {
    const mapped = this.toHttpException(exception);

    // No GraphQL, a exceção devolvida vira o erro da resposta.
    if (host.getType<GqlContextType>() === 'graphql') return mapped;

    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  toHttpException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException {
    switch (exception.code) {
      case 'P2002':
        return new ConflictException(uniqueMessage(exception.meta?.target));
      case 'P2025':
        return new NotFoundException('Registro não encontrado');
      case 'P2003':
        return new BadRequestException(
          'Registro relacionado não existe ou ainda está em uso',
        );
      default:
        this.logger.error(
          `Erro do Prisma não mapeado (${exception.code})`,
          exception.stack,
        );
        return new InternalServerErrorException(
          'Erro inesperado ao acessar o banco de dados',
        );
    }
  }
}

/** `meta.target` vem como lista de campos ou como nome do índice (ex.: "Asset_tag_key"). */
function uniqueMessage(target: unknown): string {
  const fields = Array.isArray(target)
    ? target.map(String)
    : typeof target === 'string'
      ? target.split('_')
      : [];
  const match = UNIQUE_MESSAGES.find(([keys]) =>
    keys.every((k) => fields.includes(k)),
  );
  return match ? match[1] : UNIQUE_FALLBACK;
}

// ─────────────────────── GraphQL error codes ────────────
/**
 * O driver Apollo do Nest só traduz 400, 401, 403 e 422; os demais status saem
 * como INTERNAL_SERVER_ERROR (com `status` nas extensions). Reclassifica os que
 * o sistema usa, para o cliente distinguir "não existe" e "conflito" de falha real.
 */
const STATUS_CODES: Readonly<Record<number, string>> = {
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

export function formatGraphQLError(
  formatted: GraphQLFormattedError,
): GraphQLFormattedError {
  const status = formatted.extensions?.status;
  const code = typeof status === 'number' ? STATUS_CODES[status] : undefined;
  if (!code || formatted.extensions?.code !== 'INTERNAL_SERVER_ERROR') {
    return formatted;
  }
  return { ...formatted, extensions: { ...formatted.extensions, code } };
}
