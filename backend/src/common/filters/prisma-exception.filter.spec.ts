import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';

import {
  formatGraphQLError,
  PrismaExceptionFilter,
} from './prisma-exception.filter';

// ─────────────────────── Helpers ─────────────────────────
const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('mensagem bruta do Prisma', {
    code,
    clientVersion: '6.19.2',
    meta,
  });

const gqlHost = (): ArgumentsHost =>
  ({
    getType: jest.fn().mockReturnValue('graphql'),
  }) as unknown as ArgumentsHost;

const httpHost = (headersSent = false) => {
  const response = {
    headersSent,
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const host = {
    getType: jest.fn().mockReturnValue('http'),
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
};

// ─────────────────────── Suite ───────────────────────────
describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  describe('P2002 — valor único duplicado', () => {
    it.each([
      [['tag'], 'Já existe um ativo com esta tag'],
      [['partNumber'], 'Já existe uma peça com este código'],
      [['email'], 'Já existe um usuário com este e-mail'],
      [['name'], 'Já existe um perfil de acesso com este nome'],
      [['workOrderId', 'sparePartId'], 'Esta peça já está lançada nesta OS'],
      ['Asset_tag_key', 'Já existe um ativo com esta tag'],
      [['desconhecido'], 'Já existe um registro com estes dados'],
    ])('deve devolver 409 com mensagem do campo %p', (target, message) => {
      // Arrange
      const error = prismaError('P2002', { target });

      // Act
      const result = filter.catch(error, gqlHost());

      // Assert
      expect(result).toBeInstanceOf(ConflictException);
      expect(result?.message).toBe(message);
    });
  });

  it('deve devolver 404 para P2025', () => {
    // Arrange / Act
    const result = filter.catch(prismaError('P2025'), gqlHost());

    // Assert
    expect(result).toBeInstanceOf(NotFoundException);
  });

  it('deve devolver 400 para P2003', () => {
    // Arrange / Act
    const result = filter.catch(prismaError('P2003'), gqlHost());

    // Assert
    expect(result).toBeInstanceOf(BadRequestException);
  });

  it('não deve vazar a mensagem bruta para código não mapeado', () => {
    // Arrange / Act
    const result = filter.catch(prismaError('P2034'), gqlHost());

    // Assert
    expect(result).toBeInstanceOf(InternalServerErrorException);
    expect(result?.message).not.toContain('mensagem bruta');
  });

  it('deve responder com status e corpo no contexto HTTP', () => {
    // Arrange
    const { host, response } = httpHost();

    // Act
    filter.catch(prismaError('P2002', { target: ['tag'] }), host);

    // Assert
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Já existe um ativo com esta tag',
      }),
    );
  });

  it('não deve escrever na resposta HTTP já enviada (exportação em streaming)', () => {
    // Arrange
    const { host, response } = httpHost(true);

    // Act
    filter.catch(prismaError('P2025'), host);

    // Assert
    expect(response.status).not.toHaveBeenCalled();
  });
});

describe('formatGraphQLError', () => {
  it.each([
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
  ])('deve reclassificar status %d como %s', (status, code) => {
    // Arrange
    const formatted = {
      message: 'Já existe um ativo com esta tag',
      extensions: { code: 'INTERNAL_SERVER_ERROR', status },
    };

    // Act
    const result = formatGraphQLError(formatted);

    // Assert
    expect(result.extensions?.code).toBe(code);
    expect(result.message).toBe(formatted.message);
  });

  it('deve manter INTERNAL_SERVER_ERROR para falha real (500)', () => {
    // Arrange
    const formatted = {
      message: 'Erro inesperado',
      extensions: { code: 'INTERNAL_SERVER_ERROR', status: 500 },
    };

    // Act / Assert
    expect(formatGraphQLError(formatted)).toBe(formatted);
  });

  it('não deve mexer em códigos já traduzidos pelo driver', () => {
    // Arrange
    const formatted = { message: 'x', extensions: { code: 'FORBIDDEN' } };

    // Act / Assert
    expect(formatGraphQLError(formatted)).toBe(formatted);
  });
});
