import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { PermissionGuard } from './permission.guard';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: { create: jest.fn() },
}));

const makeExecCtx = () =>
  ({
    getType: jest.fn().mockReturnValue('graphql'),
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
  }) as unknown as ExecutionContext;

/** Contexto de controller REST — usado pela exportação de planilhas (ADR 0002). */
const makeHttpCtx = (permissions: string[] | null) =>
  ({
    getType: jest.fn().mockReturnValue('http'),
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
    switchToHttp: () => ({
      getRequest: () => (permissions !== null ? { user: { permissions } } : {}),
    }),
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

  // ── permissões de custo ─────────────────────────────────
  describe('permissões de custo', () => {
    it('deve negar cost.manage a usuário com apenas cost.read', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue('cost.manage');
      (GqlExecutionContext.create as jest.Mock).mockReturnValue(
        makeGqlCtx(['cost.read', 'workorder.read']),
      );

      // Act
      const result = guard.canActivate(makeExecCtx());

      // Assert
      expect(result).toBe(false);
    });

    it('deve conceder cost.read a quem tem cost.read', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue('cost.read');
      (GqlExecutionContext.create as jest.Mock).mockReturnValue(makeGqlCtx(['cost.read']));

      // Act
      const result = guard.canActivate(makeExecCtx());

      // Assert
      expect(result).toBe(true);
    });

    it('deve negar cost.read a um Technician', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue('cost.read');
      (GqlExecutionContext.create as jest.Mock).mockReturnValue(
        makeGqlCtx(['workorder.read', 'workorder.update', 'sparepart.read']),
      );

      // Act
      const result = guard.canActivate(makeExecCtx());

      // Assert
      expect(result).toBe(false);
    });
  });

  // ── contexto HTTP (controllers REST) ────────────────────
  describe('contexto HTTP', () => {
    it('deve conceder acesso em controller REST quando a permissão está no array', () => {
      // Arrange
      (GqlExecutionContext.create as jest.Mock).mockClear();
      reflector.getAllAndOverride.mockReturnValue('workorder.read');

      // Act
      const result = guard.canActivate(makeHttpCtx(['workorder.read']));

      // Assert
      expect(result).toBe(true);
      expect(GqlExecutionContext.create).not.toHaveBeenCalled();
    });

    it('deve negar acesso em controller REST sem a permissão exigida', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue('cost.read');

      // Act
      const result = guard.canActivate(makeHttpCtx(['workorder.read']));

      // Assert
      expect(result).toBe(false);
    });

    it('deve negar acesso em controller REST sem usuário autenticado', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue('workorder.read');

      // Act
      const result = guard.canActivate(makeHttpCtx(null));

      // Assert
      expect(result).toBe(false);
    });

    it('deve conceder acesso ao Sysadmin com wildcard em controller REST', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue('cost.read');

      // Act
      const result = guard.canActivate(makeHttpCtx(['*']));

      // Assert
      expect(result).toBe(true);
    });
  });
});
