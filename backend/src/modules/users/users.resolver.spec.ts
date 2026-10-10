import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import type { UserRecord } from './users.repository';
import type { JwtUser } from '../auth/jwt.strategy';

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
  hourlyRate: 45,
  roleId: 1,
  role: mockRole,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
  ...overrides,
});

const mockActor: JwtUser = { id: 99, email: 'actor@cmms.local', roleId: 1, permissions: ['*'] };

const actorWith = (permissions: string[]): JwtUser => ({
  id: 99,
  email: 'actor@cmms.local',
  roleId: 1,
  permissions,
});

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          } satisfies Partial<jest.Mocked<UsersService>>,
        },
      ],
    }).compile();

    resolver = module.get(UsersResolver);
    service = module.get(UsersService);
  });

  it('deve delegar users() ao UsersService.findAll', async () => {
    // Arrange
    const users = [makeUser()];
    service.findAll.mockResolvedValue(users);

    // Act
    const result = await resolver.users();

    // Assert
    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(users);
  });

  it('deve delegar user(id) ao UsersService.findById', async () => {
    // Arrange
    const user = makeUser();
    service.findById.mockResolvedValue(user);

    // Act
    const result = await resolver.user(1);

    // Assert
    expect(service.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual(user);
  });

  it('deve delegar createUser(input) ao UsersService.create', async () => {
    // Arrange
    const user = makeUser();
    service.create.mockResolvedValue(user);
    const input = { name: 'João', email: 'joao@example.com', password: 'senha123', roleId: 1 };

    // Act
    const result = await resolver.createUser(input, mockActor);

    // Assert
    expect(service.create).toHaveBeenCalledWith(input, mockActor.id);
    expect(result).toEqual(user);
  });

  it('deve delegar updateUser(id, input) ao UsersService.update', async () => {
    // Arrange
    const user = makeUser({ name: 'Novo Nome' });
    service.update.mockResolvedValue(user);
    const input = { name: 'Novo Nome' };

    // Act
    const result = await resolver.updateUser(1, input, mockActor);

    // Assert
    expect(service.update).toHaveBeenCalledWith(1, input, mockActor.id);
    expect(result).toEqual(user);
  });

  it('deve delegar removeUser(id) ao UsersService.remove', async () => {
    // Arrange
    const user = makeUser({ deletedAt: new Date() });
    service.remove.mockResolvedValue(user);

    // Act
    const result = await resolver.removeUser(1, mockActor);

    // Assert
    expect(service.remove).toHaveBeenCalledWith(1, mockActor.id);
    expect(result.deletedAt).not.toBeNull();
  });

  // ── hourlyRate (dado salarial) ──────────────────────────
  describe('hourlyRate', () => {
    it('deve expor a taxa horária para quem tem cost.manage', async () => {
      // Arrange
      const user = makeUser({ hourlyRate: 45 });

      // Act
      const result = await resolver.hourlyRate(user, actorWith(['cost.manage']));

      // Assert
      expect(result).toBe(45);
    });

    it('deve expor a taxa horária para o Sysadmin com wildcard', async () => {
      // Arrange
      const user = makeUser({ hourlyRate: 45 });

      // Act
      const result = await resolver.hourlyRate(user, actorWith(['*']));

      // Assert
      expect(result).toBe(45);
    });

    it('não deve expor a taxa horária para quem só tem cost.read', async () => {
      // Arrange
      const user = makeUser({ hourlyRate: 45 });

      // Act
      const result = await resolver.hourlyRate(user, actorWith(['cost.read']));

      // Assert
      expect(result).toBeNull();
    });

    it('não deve expor a taxa horária para um Technician', async () => {
      // Arrange
      const user = makeUser({ hourlyRate: 45 });

      // Act
      const result = await resolver.hourlyRate(user, actorWith(['workorder.read']));

      // Assert
      expect(result).toBeNull();
    });

    it('deve buscar sob demanda quando o parent não traz a taxa', async () => {
      // Arrange — usuário aninhado em WorkOrder vem sem hourlyRate no select
      const nested = { ...makeUser() } as UserRecord & { hourlyRate?: number };
      delete nested.hourlyRate;
      service.findById.mockResolvedValue(makeUser({ hourlyRate: 80 }));

      // Act
      const result = await resolver.hourlyRate(nested as UserRecord, actorWith(['cost.manage']));

      // Assert
      expect(service.findById).toHaveBeenCalledWith(1);
      expect(result).toBe(80);
    });
  });

  // ── escrita da taxa horária ─────────────────────────────
  describe('escrita de hourlyRate', () => {
    it('deve rejeitar createUser com hourlyRate sem cost.manage', () => {
      // Arrange
      const input = {
        name: 'Novo',
        email: 'novo@cmms.local',
        password: 'senha1234',
        roleId: 1,
        hourlyRate: 50,
      };

      // Act & Assert
      expect(() => resolver.createUser(input, actorWith(['user.create']))).toThrow(
        ForbiddenException,
      );
      expect(service.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar updateUser com hourlyRate sem cost.manage', () => {
      // Act & Assert
      expect(() => resolver.updateUser(1, { hourlyRate: 50 }, actorWith(['user.update']))).toThrow(
        ForbiddenException,
      );
      expect(service.update).not.toHaveBeenCalled();
    });

    it('deve aceitar updateUser com hourlyRate quando há cost.manage', async () => {
      // Arrange
      service.update.mockResolvedValue(makeUser({ hourlyRate: 50 }));

      // Act
      await resolver.updateUser(1, { hourlyRate: 50 }, actorWith(['user.update', 'cost.manage']));

      // Assert
      expect(service.update).toHaveBeenCalledWith(1, { hourlyRate: 50 }, 99);
    });

    it('deve aceitar updateUser sem hourlyRate mesmo sem cost.manage', async () => {
      // Arrange
      service.update.mockResolvedValue(makeUser({ name: 'Renomeado' }));

      // Act
      await resolver.updateUser(1, { name: 'Renomeado' }, actorWith(['user.update']));

      // Assert
      expect(service.update).toHaveBeenCalled();
    });
  });
});
