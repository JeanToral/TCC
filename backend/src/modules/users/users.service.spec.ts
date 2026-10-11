import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { UserRecord } from './users.repository';

const mockRole = {
  id: 1,
  name: 'Engineer',
  description: null,
  permissions: ['user.read'],
  isSystem: false,
};

const makeUser = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: 1,
  name: 'João Silva',
  email: 'joao@example.com',
  isActive: true,
  roleId: 1,
  role: mockRole,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
  ...overrides,
});

const ACTOR_ID = 99;

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;
  let audit: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findPasswordHash: jest.fn(),
            findManyByIds: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          } satisfies Partial<jest.Mocked<UsersRepository>>,
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(UsersRepository);
    audit = module.get(AuditLogService);
  });

  describe('findAll', () => {
    it('deve retornar todos os usuários ativos', async () => {
      // Arrange
      const users = [makeUser(), makeUser({ id: 2, email: 'outro@example.com' })];
      repo.findAll.mockResolvedValue(users);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('deve retornar usuário quando encontrado', async () => {
      // Arrange
      const user = makeUser();
      repo.findById.mockResolvedValue(user);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result).toEqual(user);
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('deve criar usuário com senha hasheada', async () => {
      // Arrange
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeUser());

      // Act
      await service.create({ name: 'João', email: 'joao@example.com', password: 'senha123', roleId: 1 }, ACTOR_ID);

      // Assert
      const callArg = repo.create.mock.calls[0][0];
      expect(callArg.passwordHash).toBeDefined();
      expect(callArg.passwordHash).not.toBe('senha123');
      expect(await bcrypt.compare('senha123', callArg.passwordHash)).toBe(true);
    });

    it('deve lançar ConflictException ao criar com email duplicado', async () => {
      // Arrange
      repo.findByEmail.mockResolvedValue(makeUser());

      // Act & Assert
      await expect(
        service.create({ name: 'Outro', email: 'joao@example.com', password: 'senha123', roleId: 1 }, ACTOR_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos informados do usuário', async () => {
      // Arrange
      const updated = makeUser({ name: 'Novo Nome' });
      repo.findById.mockResolvedValue(makeUser());
      repo.findByEmail.mockResolvedValue(null);
      repo.update.mockResolvedValue(updated);

      // Act
      const result = await service.update(1, { name: 'Novo Nome' }, ACTOR_ID);

      // Assert
      expect(result.name).toBe('Novo Nome');
      expect(repo.update).toHaveBeenCalledWith(1, { name: 'Novo Nome' });
    });

    it('deve lançar ForbiddenException ao usuário tentar alterar o próprio role', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: 1 }));

      // Act & Assert
      await expect(service.update(1, { roleId: 2 }, /* actorId = */ 1)).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ConflictException ao atualizar para email já existente de outro usuário', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser());
      repo.findByEmail.mockResolvedValue(makeUser({ id: 2 }));

      // Act & Assert
      await expect(service.update(1, { email: 'duplicado@example.com' }, ACTOR_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve hashear nova senha ao atualizar', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(makeUser());

      // Act
      await service.update(1, { password: 'novaSenha123' }, ACTOR_ID);

      // Assert
      const callArg = repo.update.mock.calls[0][1];
      expect(callArg.passwordHash).toBeDefined();
      expect(await bcrypt.compare('novaSenha123', callArg.passwordHash!)).toBe(true);
    });
  });

  describe('updateMyProfile', () => {
    const SELF_ID = 1;

    it('deve alterar o nome do próprio usuário sem exigir senha', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: SELF_ID }));
      repo.update.mockResolvedValue(makeUser({ id: SELF_ID, name: 'João Atualizado' }));

      // Act
      const result = await service.updateMyProfile(SELF_ID, { name: 'João Atualizado' });

      // Assert
      expect(result.name).toBe('João Atualizado');
      expect(repo.update).toHaveBeenCalledWith(SELF_ID, { name: 'João Atualizado' });
      expect(repo.findPasswordHash).not.toHaveBeenCalled();
    });

    it('deve alterar sempre o usuário do token', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: 7 }));
      repo.update.mockResolvedValue(makeUser({ id: 7, name: 'Outro Nome' }));

      // Act
      await service.updateMyProfile(7, { name: 'Outro Nome' });

      // Assert
      expect(repo.findById).toHaveBeenCalledWith(7);
      expect(repo.update).toHaveBeenCalledWith(7, expect.any(Object));
    });

    it('deve alterar o e-mail quando a senha atual confere', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: SELF_ID }));
      repo.findPasswordHash.mockResolvedValue(await bcrypt.hash('senhaAtual1', 4));
      repo.findByEmail.mockResolvedValue(null);
      repo.update.mockResolvedValue(makeUser({ id: SELF_ID, email: 'novo@example.com' }));

      // Act
      const result = await service.updateMyProfile(SELF_ID, {
        email: 'novo@example.com',
        currentPassword: 'senhaAtual1',
      });

      // Assert
      expect(result.email).toBe('novo@example.com');
      expect(repo.update).toHaveBeenCalledWith(SELF_ID, { email: 'novo@example.com' });
    });

    it('deve exigir a senha atual ao trocar o e-mail', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: SELF_ID }));

      // Act & Assert
      await expect(
        service.updateMyProfile(SELF_ID, { email: 'novo@example.com' }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('deve rejeitar senha atual errada', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: SELF_ID }));
      repo.findPasswordHash.mockResolvedValue(await bcrypt.hash('senhaAtual1', 4));

      // Act & Assert
      await expect(
        service.updateMyProfile(SELF_ID, { email: 'novo@example.com', currentPassword: 'errada' }),
      ).rejects.toThrow('Senha atual incorreta');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('deve rejeitar e-mail já usado por outro usuário', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: SELF_ID }));
      repo.findPasswordHash.mockResolvedValue(await bcrypt.hash('senhaAtual1', 4));
      repo.findByEmail.mockResolvedValue(makeUser({ id: 2, email: 'ocupado@example.com' }));

      // Act & Assert
      await expect(
        service.updateMyProfile(SELF_ID, {
          email: 'ocupado@example.com',
          currentPassword: 'senhaAtual1',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('não deve exigir senha quando o e-mail enviado é o mesmo', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: SELF_ID, email: 'joao@example.com' }));
      repo.update.mockResolvedValue(makeUser({ id: SELF_ID, name: 'Novo' }));

      // Act
      await service.updateMyProfile(SELF_ID, { name: 'Novo', email: 'joao@example.com' });

      // Assert
      expect(repo.findPasswordHash).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(SELF_ID, { name: 'Novo' });
    });

    it('deve registrar AuditLog com nome e e-mail antes e depois', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: SELF_ID, name: 'Antigo' }));
      repo.update.mockResolvedValue(makeUser({ id: SELF_ID, name: 'Novo' }));

      // Act
      await service.updateMyProfile(SELF_ID, { name: 'Novo' });

      // Assert
      expect(audit.log).toHaveBeenCalledWith(
        SELF_ID,
        'user.updateSelf',
        'User',
        SELF_ID,
        { name: 'Antigo', email: 'joao@example.com' },
        { name: 'Novo', email: 'joao@example.com' },
      );
    });

    it('não deve gravar nem auditar quando nada mudou', async () => {
      // Arrange
      const current = makeUser({ id: SELF_ID });
      repo.findById.mockResolvedValue(current);

      // Act
      const result = await service.updateMyProfile(SELF_ID, { name: current.name });

      // Assert
      expect(result).toBe(current);
      expect(repo.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('deve ignorar campos fora de nome e e-mail', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser({ id: SELF_ID }));
      repo.update.mockResolvedValue(makeUser({ id: SELF_ID, name: 'Novo' }));
      const smuggled = { name: 'Novo', roleId: 99, isActive: false, hourlyRate: 500 };

      // Act
      await service.updateMyProfile(SELF_ID, smuggled);

      // Assert
      expect(repo.update).toHaveBeenCalledWith(SELF_ID, { name: 'Novo' });
    });
  });

  describe('remove', () => {
    it('deve fazer soft-delete do usuário', async () => {
      // Arrange
      const deleted = makeUser({ deletedAt: new Date() });
      repo.findById.mockResolvedValue(makeUser());
      repo.softDelete.mockResolvedValue(deleted);

      // Act
      const result = await service.remove(1, ACTOR_ID);

      // Assert
      expect(result.deletedAt).not.toBeNull();
      expect(repo.softDelete).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException ao remover usuário inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(999, ACTOR_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
