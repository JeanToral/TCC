import { ConflictException, NotFoundException } from '@nestjs/common';
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
