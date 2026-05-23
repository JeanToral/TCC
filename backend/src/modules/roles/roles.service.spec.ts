import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { RoleRecord } from './roles.repository';

// ─────────────────────── Fixtures ────────────────────────
const ACTOR_ID = 99;

const makeRole = (overrides: Partial<RoleRecord> = {}): RoleRecord => ({
  id: 1,
  name: 'Engineer',
  description: 'Engenheiro de manutenção',
  permissions: ['workorder.read', 'workorder.update'],
  isSystem: false,
  ...overrides,
});

// ─────────────────────── Suite ───────────────────────────
describe('RolesService', () => {
  let service: RolesService;
  let repo: jest.Mocked<RolesRepository>;
  let audit: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          } satisfies Partial<jest.Mocked<RolesRepository>>,
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(RolesService);
    repo = module.get(RolesRepository);
    audit = module.get(AuditLogService);
  });

  // ── findById ─────────────────────────────────────────────

  describe('findById', () => {
    it('deve retornar a role quando encontrada', async () => {
      // Arrange
      const role = makeRole();
      repo.findById.mockResolvedValue(role);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result).toEqual(role);
      expect(repo.findById).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException para role inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────

  describe('create', () => {
    it('deve criar a role e registrar AuditLog com ação role.create', async () => {
      // Arrange
      const role = makeRole();
      repo.create.mockResolvedValue(role);

      // Act
      await service.create(
        { name: 'Engineer', permissions: ['workorder.read'] },
        ACTOR_ID,
      );

      // Assert
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(audit.log).toHaveBeenCalledWith(
        ACTOR_ID,
        'role.create',
        'Role',
        role.id,
        null,
        expect.objectContaining({ name: role.name }),
      );
    });
  });

  // ── update ───────────────────────────────────────────────

  describe('update', () => {
    it('deve lançar ForbiddenException ao tentar editar role com isSystem = true', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeRole({ isSystem: true, name: 'Sysadmin' }));

      // Act & Assert
      await expect(
        service.update(1, { name: 'Hackeado' }, ACTOR_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve permitir edição de role com isSystem = false', async () => {
      // Arrange
      const before = makeRole({ isSystem: false });
      const after = makeRole({ name: 'Senior Engineer' });
      repo.findById.mockResolvedValue(before);
      repo.update.mockResolvedValue(after);

      // Act
      const result = await service.update(1, { name: 'Senior Engineer' }, ACTOR_ID);

      // Assert
      expect(result.name).toBe('Senior Engineer');
      expect(repo.update).toHaveBeenCalledTimes(1);
    });

    it('deve registrar AuditLog com ação role.update ao atualizar permissões', async () => {
      // Arrange
      const before = makeRole({ permissions: ['workorder.read'] });
      const after = makeRole({ permissions: ['workorder.read', 'workorder.create'] });
      repo.findById.mockResolvedValue(before);
      repo.update.mockResolvedValue(after);

      // Act
      await service.update(1, { permissions: ['workorder.read', 'workorder.create'] }, ACTOR_ID);

      // Assert
      expect(audit.log).toHaveBeenCalledWith(
        ACTOR_ID,
        'role.update',
        'Role',
        1,
        expect.objectContaining({ permissions: before.permissions }),
        expect.objectContaining({ permissions: after.permissions }),
      );
    });
  });

  // ── delete ───────────────────────────────────────────────

  describe('delete', () => {
    it('deve lançar ForbiddenException ao tentar deletar role com isSystem = true', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeRole({ isSystem: true, name: 'Sysadmin' }));

      // Act & Assert
      await expect(service.delete(1, ACTOR_ID)).rejects.toThrow(ForbiddenException);
    });

    it('deve permitir deleção de role com isSystem = false', async () => {
      // Arrange
      const role = makeRole({ isSystem: false });
      repo.findById.mockResolvedValue(role);
      repo.delete.mockResolvedValue(role);

      // Act
      const result = await service.delete(1, ACTOR_ID);

      // Assert
      expect(result).toEqual(role);
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('deve registrar AuditLog com ação role.delete ao deletar', async () => {
      // Arrange
      const role = makeRole({ isSystem: false });
      repo.findById.mockResolvedValue(role);
      repo.delete.mockResolvedValue(role);

      // Act
      await service.delete(1, ACTOR_ID);

      // Assert
      expect(audit.log).toHaveBeenCalledWith(
        ACTOR_ID,
        'role.delete',
        'Role',
        1,
        expect.objectContaining({ name: role.name }),
        null,
      );
    });

    it('deve lançar NotFoundException ao tentar deletar role inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(999, ACTOR_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
