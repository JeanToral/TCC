import { Test, type TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../generated/prisma';

import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import type { NotificationRecord } from './notifications.repository';

// ─────────────────────── Fixtures ────────────────────────
const makeNotification = (overrides: Partial<NotificationRecord> = {}): NotificationRecord => ({
  id: 1,
  type: NotificationType.LOW_STOCK,
  message: 'Estoque baixo: Parafuso M8',
  isRead: false,
  userId: 1,
  workOrderId: null,
  sparePartId: 5,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

// ─────────────────────── Suite ───────────────────────────
describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: jest.Mocked<NotificationsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            countUnread: jest.fn(),
          } satisfies Partial<jest.Mocked<NotificationsRepository>>,
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
    repo = module.get(NotificationsRepository);
  });

  // ── notify (fire-and-forget) ──────────────────────────────

  describe('notify', () => {
    it('deve chamar repo.create com os dados corretos', async () => {
      // Arrange
      repo.create.mockResolvedValue(makeNotification());

      // Act
      service.notify(1, NotificationType.LOW_STOCK, 'Estoque baixo: Parafuso M8', { sparePartId: 5 });

      // Aguarda o microtask (promise interna do fire-and-forget)
      await Promise.resolve();

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: NotificationType.LOW_STOCK,
          message: 'Estoque baixo: Parafuso M8',
          sparePartId: 5,
        }),
      );
    });

    it('não deve lançar exceção quando repo.create rejeitar (fire-and-forget)', async () => {
      // Arrange
      repo.create.mockRejectedValue(new Error('DB error'));

      // Act — não deve lançar
      expect(() =>
        service.notify(1, NotificationType.OVERDUE_WORK_ORDER, 'OS vencida', { workOrderId: 10 }),
      ).not.toThrow();

      // Aguarda a rejeição ser absorvida internamente
      await Promise.resolve();

      // Assert — repo foi chamado; o erro foi silenciado
      expect(repo.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── findAll ──────────────────────────────────────────────

  describe('findAll', () => {
    it('deve retornar todas as notificações do usuário', async () => {
      // Arrange
      const notifications = [makeNotification(), makeNotification({ id: 2 })];
      repo.findAll.mockResolvedValue(notifications);

      // Act
      const result = await service.findAll(1);

      // Assert
      expect(result).toHaveLength(2);
      expect(repo.findAll).toHaveBeenCalledWith(1, undefined);
    });

    it('deve repassar filtro unreadOnly ao repositório', async () => {
      // Arrange
      repo.findAll.mockResolvedValue([makeNotification()]);

      // Act
      await service.findAll(1, true);

      // Assert
      expect(repo.findAll).toHaveBeenCalledWith(1, true);
    });
  });

  // ── markAsRead ───────────────────────────────────────────

  describe('markAsRead', () => {
    it('deve marcar notificação como lida', async () => {
      // Arrange
      const read = makeNotification({ isRead: true });
      repo.markAsRead.mockResolvedValue(read);

      // Act
      const result = await service.markAsRead(1, 1);

      // Assert
      expect(result.isRead).toBe(true);
      expect(repo.markAsRead).toHaveBeenCalledWith(1, 1);
    });
  });

  // ── countUnread ──────────────────────────────────────────

  describe('countUnread', () => {
    it('deve retornar a contagem de notificações não lidas', async () => {
      // Arrange
      repo.countUnread.mockResolvedValue(3);

      // Act
      const result = await service.countUnread(1);

      // Assert
      expect(result).toBe(3);
      expect(repo.countUnread).toHaveBeenCalledWith(1);
    });
  });
});
