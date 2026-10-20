import { Test, type TestingModule } from '@nestjs/testing';

import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import type { AuditLogWithUserRecord } from './audit-log.repository';
import { encodeCursor } from '../../common/pagination/page-args';

// ─────────────────────── Fixtures ────────────────────────
const makeEntry = (
  overrides: Partial<AuditLogWithUserRecord> = {},
): AuditLogWithUserRecord => ({
  id: 1,
  userId: 99,
  user: { id: 99, name: 'Admin', email: 'admin@cmms.com' },
  action: 'role.update',
  targetType: 'Role',
  targetId: 1,
  before: { permissions: ['workorder.read'] },
  after: { permissions: ['workorder.read', 'workorder.create'] },
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

// ─────────────────────── Suite ───────────────────────────
describe('AuditLogService', () => {
  let service: AuditLogService;
  let repo: jest.Mocked<AuditLogRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AuditLogRepository,
          useValue: {
            create: jest.fn(),
            findPaginated: jest.fn(),
          } satisfies Partial<jest.Mocked<AuditLogRepository>>,
        },
      ],
    }).compile();

    service = module.get(AuditLogService);
    repo = module.get(AuditLogRepository);
  });

  // ── log (fire-and-forget) ────────────────────────────────

  describe('log', () => {
    it('deve chamar repo.create com os dados corretos', async () => {
      // Arrange
      repo.create.mockResolvedValue(makeEntry());
      const before = { permissions: ['workorder.read'] };
      const after = { permissions: ['workorder.read', 'workorder.create'] };

      // Act
      service.log(99, 'role.update', 'Role', 1, before, after);

      // Aguarda o microtask (promise interna do fire-and-forget)
      await Promise.resolve();

      // Assert
      expect(repo.create).toHaveBeenCalledWith({
        userId: 99,
        action: 'role.update',
        targetType: 'Role',
        targetId: 1,
        before,
        after,
      });
    });

    it('não deve lançar exceção quando repo.create rejeitar (fire-and-forget)', async () => {
      // Arrange
      repo.create.mockRejectedValue(new Error('DB error'));

      // Act — não deve lançar
      expect(() => service.log(99, 'user.delete', 'User', 5)).not.toThrow();

      // Aguarda a rejeição ser absorvida internamente
      await Promise.resolve();

      // Assert — repo foi chamado; o erro não propagou
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('deve funcionar sem os parâmetros opcionais before/after', async () => {
      // Arrange
      repo.create.mockResolvedValue(
        makeEntry({ before: undefined, after: undefined }),
      );

      // Act
      service.log(1, 'role.create', 'Role', 2);
      await Promise.resolve();

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ before: undefined, after: undefined }),
      );
    });
  });

  // ── findPaginated ────────────────────────────────────────

  describe('findPaginated', () => {
    it('deve serializar before/after como JSON', async () => {
      // Arrange
      repo.findPaginated.mockResolvedValue({
        items: [makeEntry()],
        hasNextPage: false,
      });

      // Act
      const result = await service.findPaginated(undefined, 50);

      // Assert
      const node = result.edges[0].node;
      expect(node.before).toBe('{"permissions":["workorder.read"]}');
      expect(JSON.parse(node.after ?? '')).toEqual({
        permissions: ['workorder.read', 'workorder.create'],
      });
      expect(node.user).toEqual({
        id: 99,
        name: 'Admin',
        email: 'admin@cmms.com',
      });
    });

    it('deve devolver before/after indefinidos quando o banco guarda null', async () => {
      // Arrange
      repo.findPaginated.mockResolvedValue({
        items: [makeEntry({ before: null, after: null })],
        hasNextPage: false,
      });

      // Act
      const result = await service.findPaginated(undefined, 50);

      // Assert
      expect(result.edges[0].node.before).toBeUndefined();
      expect(result.edges[0].node.after).toBeUndefined();
    });

    it('deve montar pageInfo com o cursor do último item', async () => {
      // Arrange
      repo.findPaginated.mockResolvedValue({
        items: [makeEntry({ id: 9 }), makeEntry({ id: 7 })],
        hasNextPage: true,
      });

      // Act
      const result = await service.findPaginated(undefined, 2);

      // Assert
      expect(result.pageInfo).toEqual({
        hasNextPage: true,
        endCursor: encodeCursor(7),
      });
      expect(result.edges.map((e) => e.cursor)).toEqual([
        encodeCursor(9),
        encodeCursor(7),
      ]);
    });

    it('deve devolver endCursor null quando não houver itens', async () => {
      // Arrange
      repo.findPaginated.mockResolvedValue({ items: [], hasNextPage: false });

      // Act
      const result = await service.findPaginated(undefined, 50);

      // Assert
      expect(result).toEqual({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      });
    });

    it('deve repassar filtro e cursor ao repositório', async () => {
      // Arrange
      repo.findPaginated.mockResolvedValue({ items: [], hasNextPage: false });
      const filter = {
        targetType: 'WorkOrder',
        targetId: 42,
        action: 'workorder.approve',
      };

      // Act
      await service.findPaginated(filter, 20, 'abc');

      // Assert
      expect(repo.findPaginated).toHaveBeenCalledWith(filter, 20, 'abc');
    });
  });
});
