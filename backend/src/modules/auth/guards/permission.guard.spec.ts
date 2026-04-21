import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { PermissionGuard } from './permission.guard';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: { create: jest.fn() },
}));

const makeExecCtx = () =>
  ({
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
  }) as unknown as ExecutionContext;

const makeGqlCtx = (permissions: string[] | null) => ({
  getContext: () => ({
    req: permissions !== null ? { user: { permissions } } : {},
  }),
});

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new PermissionGuard(reflector);
  });

  it('deve conceder acesso quando nenhuma permissão é requerida', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue(undefined);
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(makeGqlCtx([]));

    // Act
    const result = guard.canActivate(makeExecCtx());

    // Assert
    expect(result).toBe(true);
  });

  it('deve conceder acesso ao Sysadmin com wildcard ["*"]', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue('workorder.approve');
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(makeGqlCtx(['*']));

    // Act
    const result = guard.canActivate(makeExecCtx());

    // Assert
    expect(result).toBe(true);
  });

  it('deve conceder acesso quando a permissão exigida está no array', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue('user.read');
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(makeGqlCtx(['user.read', 'user.update']));

    // Act
    const result = guard.canActivate(makeExecCtx());

    // Assert
    expect(result).toBe(true);
  });

  it('deve negar acesso quando a permissão exigida não está no array', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue('user.delete');
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(makeGqlCtx(['user.read', 'user.update']));

    // Act
    const result = guard.canActivate(makeExecCtx());

    // Assert
    expect(result).toBe(false);
  });

  it('deve negar acesso quando não há usuário autenticado', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue('user.read');
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(makeGqlCtx(null));

    // Act
    const result = guard.canActivate(makeExecCtx());

    // Assert
    expect(result).toBe(false);
  });
});
