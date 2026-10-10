import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../generated/prisma';

import { SparePartsService } from './spare-parts.service';
import { SparePartsRepository } from './spare-parts.repository';
import { NotificationsService } from '../notifications/notifications.service';
import type { SparePartRecord } from './spare-parts.repository';

// ─────────────────────── Fixtures ────────────────────────
const makePart = (overrides: Partial<SparePartRecord> = {}): SparePartRecord => ({
  id: 1,
  name: 'Rolamento 6205',
  partNumber: 'ROL-6205',
  description: null,
  quantity: 10,
  minimumStock: 5,
  unitCost: 35.9,
  deletedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

// ─────────────────────── Suite ───────────────────────────
describe('SparePartsService', () => {
  let service: SparePartsService;
  let repo: jest.Mocked<SparePartsRepository>;
  let notifications: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparePartsService,
        {
          provide: SparePartsRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            findWorkOrderParts: jest.fn(),
            addWorkOrderPart: jest.fn(),
            removeWorkOrderPart: jest.fn(),
            decrementQuantity: jest.fn(),
            findByWorkOrder: jest.fn(),
          } satisfies Partial<jest.Mocked<SparePartsRepository>>,
        },
        {
          provide: NotificationsService,
          useValue: { notify: jest.fn() } satisfies Partial<jest.Mocked<NotificationsService>>,
        },
      ],
    }).compile();

    service = module.get(SparePartsService);
    repo = module.get(SparePartsRepository);
    notifications = module.get(NotificationsService);
  });

  // ── findById ─────────────────────────────────────────
  describe('findById', () => {
    it('deve retornar a peça quando encontrada', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makePart());

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result.id).toBe(1);
      expect(result.partNumber).toBe('ROL-6205');
    });

    it('deve lançar NotFoundException quando peça não existe', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────
  describe('create', () => {
    it('deve criar uma nova peça de reposição', async () => {
      // Arrange
      const part = makePart();
      repo.create.mockResolvedValue(part);

      // Act
      const result = await service.create({
        name: 'Rolamento 6205',
        partNumber: 'ROL-6205',
        quantity: 10,
        minimumStock: 5,
      });

      // Assert
      expect(result.name).toBe('Rolamento 6205');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ partNumber: 'ROL-6205' }));
    });
  });

  // ── notifyLowStock ────────────────────────────────────
  // A baixa de estoque em si acontece na transação de conclusão da OS
  // (WorkOrdersRepository.completeWithCostSnapshot) — ver ADR 0001. Aqui só
  // a notificação é responsabilidade deste serviço.
  describe('notifyLowStock', () => {
    it('não deve notificar quando a peça continua acima do mínimo', () => {
      // Arrange
      const parts = [
        { id: 1, name: 'Rolamento 6205', partNumber: 'ROL-6205', quantity: 8, minimumStock: 5 },
      ];

      // Act
      service.notifyLowStock(parts, 99);

      // Assert
      expect(notifications.notify).not.toHaveBeenCalled();
    });

    it('deve gerar Notification LOW_STOCK quando quantity < minimumStock após decremento', () => {
      // Arrange
      const parts = [
        { id: 1, name: 'Rolamento 6205', partNumber: 'ROL-6205', quantity: 2, minimumStock: 5 },
      ];

      // Act
      service.notifyLowStock(parts, 99);

      // Assert
      expect(notifications.notify).toHaveBeenCalledWith(
        99,
        NotificationType.LOW_STOCK,
        expect.stringContaining('Estoque baixo'),
        expect.objectContaining({ sparePartId: 1 }),
      );
    });

    it('não deve notificar quando a quantidade fica exatamente no mínimo', () => {
      // Arrange — a regra é "abaixo do mínimo", não "no mínimo"
      const parts = [
        { id: 1, name: 'Rolamento 6205', partNumber: 'ROL-6205', quantity: 5, minimumStock: 5 },
      ];

      // Act
      service.notifyLowStock(parts, 99);

      // Assert
      expect(notifications.notify).not.toHaveBeenCalled();
    });

    it('deve notificar uma vez por peça abaixo do mínimo', () => {
      // Arrange
      const parts = [
        { id: 1, name: 'Rolamento 6205', partNumber: 'ROL-6205', quantity: 2, minimumStock: 5 },
        { id: 2, name: 'Correia A-52', partNumber: 'COR-A52', quantity: 9, minimumStock: 3 },
        { id: 3, name: 'Retentor 40x62', partNumber: 'RET-4062', quantity: 0, minimumStock: 2 },
      ];

      // Act
      service.notifyLowStock(parts, 99);

      // Assert
      expect(notifications.notify).toHaveBeenCalledTimes(2);
    });
  });
});
