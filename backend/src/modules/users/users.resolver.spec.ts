import { Test, type TestingModule } from '@nestjs/testing';

import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
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
    const result = await resolver.user('user-1');

    // Assert
    expect(service.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(user);
  });

  it('deve delegar createUser(input) ao UsersService.create', async () => {
    // Arrange
    const user = makeUser();
    service.create.mockResolvedValue(user);
    const input = { name: 'João', email: 'joao@example.com', password: 'senha123', roleId: 'role-1' };

    // Act
    const result = await resolver.createUser(input);

    // Assert
    expect(service.create).toHaveBeenCalledWith(input);
    expect(result).toEqual(user);
  });

  it('deve delegar updateUser(id, input) ao UsersService.update', async () => {
    // Arrange
    const user = makeUser({ name: 'Novo Nome' });
    service.update.mockResolvedValue(user);
    const input = { name: 'Novo Nome' };

    // Act
    const result = await resolver.updateUser('user-1', input);

    // Assert
    expect(service.update).toHaveBeenCalledWith('user-1', input);
    expect(result).toEqual(user);
  });

  it('deve delegar removeUser(id) ao UsersService.remove', async () => {
    // Arrange
    const user = makeUser({ deletedAt: new Date() });
    service.remove.mockResolvedValue(user);

    // Act
    const result = await resolver.removeUser('user-1');

    // Assert
    expect(service.remove).toHaveBeenCalledWith('user-1');
    expect(result.deletedAt).not.toBeNull();
  });
});
