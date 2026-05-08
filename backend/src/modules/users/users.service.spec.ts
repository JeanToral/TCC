import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import type { UserRecord } from './users.repository';

const mockRole = {
  id: 'role-1',
  name: 'Engineer',
  description: null,
  permissions: ['user.read'],
  isSystem: false,
};

const makeUser = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@example.com',
  isActive: true,
  roleId: 'role-1',
  role: mockRole,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
  ...overrides,
});

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
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(UsersRepository);
  });

  describe('findAll', () => {
    it('deve retornar todos os usuários ativos', async () => {
      // Arrange
      const users = [makeUser(), makeUser({ id: 'user-2', email: 'outro@example.com' })];
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
      const result = await service.findById('user-1');

      // Assert
      expect(result).toEqual(user);
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('deve criar usuário com senha hasheada', async () => {
      // Arrange
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeUser());

      // Act
      await service.create({ name: 'João', email: 'joao@example.com', password: 'senha123', roleId: 'role-1' });

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
        service.create({ name: 'Outro', email: 'joao@example.com', password: 'senha123', roleId: 'role-1' }),
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
      const result = await service.update('user-1', { name: 'Novo Nome' });

      // Assert
      expect(result.name).toBe('Novo Nome');
      expect(repo.update).toHaveBeenCalledWith('user-1', { name: 'Novo Nome' });
    });

    it('deve lançar ConflictException ao atualizar para email já existente de outro usuário', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser());
      repo.findByEmail.mockResolvedValue(makeUser({ id: 'user-2' }));

      // Act & Assert
      await expect(service.update('user-1', { email: 'duplicado@example.com' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve hashear nova senha ao atualizar', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(makeUser());

      // Act
      await service.update('user-1', { password: 'novaSenha123' });

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
      const result = await service.remove('user-1');

      // Assert
      expect(result.deletedAt).not.toBeNull();
      expect(repo.softDelete).toHaveBeenCalledWith('user-1');
    });

    it('deve lançar NotFoundException ao remover usuário inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('inexistente')).rejects.toThrow(NotFoundException);
    });
  });
});
