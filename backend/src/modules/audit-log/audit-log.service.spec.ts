import { Test, type TestingModule } from '@nestjs/testing';

import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import type { AuditLogRecord } from './audit-log.repository';

// ─────────────────────── Fixtures ────────────────────────
const makeEntry = (overrides: Partial<AuditLogRecord> = {}): AuditLogRecord => ({
  id: 1,
  userId: 99,
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
            findAll: jest.fn(),
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
      expect(() =>
        service.log(99, 'user.delete', 'User', 5),
      ).not.toThrow();

      // Aguarda a rejeição ser absorvida internamente
      await Promise.resolve();

      // Assert — repo foi chamado; o erro não propagou
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('deve funcionar sem os parâmetros opcionais before/after', async () => {
      // Arrange
      repo.create.mockResolvedValue(makeEntry({ before: undefined, after: undefined }));

      // Act
      service.log(1, 'role.create', 'Role', 2);
      await Promise.resolve();

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ before: undefined, after: undefined }),
      );
    });
  });

  // ── findAll ──────────────────────────────────────────────

  describe('findAll', () => {
    it('deve retornar todos os logs sem filtro', async () => {
      // Arrange
      const entries = [makeEntry(), makeEntry({ id: 2, action: 'user.update' })];
      repo.findAll.mockResolvedValue(entries);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(repo.findAll).toHaveBeenCalledWith(undefined);
    });

    it('deve repassar filtro targetType ao repositório', async () => {
      // Arrange
      repo.findAll.mockResolvedValue([makeEntry()]);

      // Act
      await service.findAll({ targetType: 'Role' });

      // Assert
      expect(repo.findAll).toHaveBeenCalledWith({ targetType: 'Role' });
    });

    it('deve repassar filtro targetId ao repositório', async () => {
      // Arrange
      repo.findAll.mockResolvedValue([makeEntry()]);

      // Act
      await service.findAll({ targetType: 'WorkOrder', targetId: 42 });

      // Assert
      expect(repo.findAll).toHaveBeenCalledWith({ targetType: 'WorkOrder', targetId: 42 });
    });
  });
});
