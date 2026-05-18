import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Priority, WorkOrderStatus, WorkOrderType as WorkOrderTypeEnum } from '../../generated/prisma';

import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersRepository } from './work-orders.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SparePartsService } from '../spare-parts/spare-parts.service';
import type { WorkOrderRecord } from './work-orders.repository';

// ─────────────────────── Fixtures ────────────────────────
const mockAsset = { id: 1, name: 'Torno CNC 01', tag: 'MQ-001', location: 'Usinagem' };
const mockRole = { id: 1, name: 'Engineer', description: null, permissions: ['workorder.create'], isSystem: false };
const mockUser = {
  id: 1, name: 'Eng. Costa', email: 'eng@cmms.local',
  isActive: true, roleId: 1, role: mockRole,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), deletedAt: null,
};

const ACTOR_ID = 99;

const makeWorkOrder = (overrides: Partial<WorkOrderRecord> = {}): WorkOrderRecord => ({
  id: 1,
  title: 'Falha no motor',
  description: 'Motor parou de funcionar',
  type: WorkOrderTypeEnum.CORRECTIVE,
  priority: Priority.HIGH,
  status: WorkOrderStatus.REQUESTED,
  assetId: 1,
  asset: mockAsset,
  requestedById: 1,
  requestedBy: mockUser,
  assignedToId: null,
  assignedTo: null,
  scheduledStart: null,
  scheduledEnd: null,
  rejectionReason: null,
  cancellationReason: null,
  closingNotes: null,
  startedAt: null,
  completedAt: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

// ─────────────────────── Suite ───────────────────────────
describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let repo: jest.Mocked<WorkOrdersRepository>;
  let notifications: jest.Mocked<NotificationsService>;
  let spareParts: jest.Mocked<SparePartsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        {
          provide: WorkOrdersRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          } satisfies Partial<jest.Mocked<WorkOrdersRepository>>,
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { notify: jest.fn() },
        },
        {
          provide: SparePartsService,
          useValue: {
            decrementOnComplete: jest.fn().mockResolvedValue(undefined),
            addWorkOrderPart: jest.fn(),
            removeWorkOrderPart: jest.fn(),
          } satisfies Partial<jest.Mocked<SparePartsService>>,
        },
      ],
    }).compile();

    service = module.get(WorkOrdersService);
    repo = module.get(WorkOrdersRepository);
    notifications = module.get(NotificationsService);
    spareParts = module.get(SparePartsService);
  });

  // ── create ────────────────────────────────────────────
  describe('create', () => {
    it('deve criar uma OS válida vinculada a um ativo existente', async () => {
      // Arrange
      const workOrder = makeWorkOrder();
      repo.create.mockResolvedValue(workOrder);

      // Act
      const result = await service.create(
        { title: 'Falha no motor', description: 'Motor parou', type: WorkOrderTypeEnum.CORRECTIVE, priority: Priority.HIGH, assetId: 1 },
        1,
      );

      // Assert
      expect(result.status).toBe(WorkOrderStatus.REQUESTED);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: 1, requestedById: 1 }),
      );
    });
  });

  // ── findById ──────────────────────────────────────────
  describe('findById', () => {
    it('deve retornar OS quando encontrada', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder());

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result.id).toBe(1);
    });

    it('deve lançar NotFoundException quando OS não existe', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── approve ───────────────────────────────────────────
  describe('approve', () => {
    it('deve permitir transição válida REQUESTED → APPROVED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REQUESTED }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.APPROVED }));

      // Act
      const result = await service.approve(1, ACTOR_ID);

      // Assert
      expect(result.status).toBe(WorkOrderStatus.APPROVED);
      expect(repo.update).toHaveBeenCalledWith(1, { status: WorkOrderStatus.APPROVED });
    });

    it('deve rejeitar transição inválida COMPLETED → APPROVED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.COMPLETED }));

      // Act & Assert
      await expect(service.approve(1, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar transição inválida REJECTED → APPROVED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REJECTED }));

      // Act & Assert
      await expect(service.approve(1, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ── reject ────────────────────────────────────────────
  describe('reject', () => {
    it('deve rejeitar OS com motivo obrigatório', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REQUESTED }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REJECTED, rejectionReason: 'Sem orçamento' }));

      // Act
      const result = await service.reject(1, { rejectionReason: 'Sem orçamento' }, ACTOR_ID);

      // Assert
      expect(result.status).toBe(WorkOrderStatus.REJECTED);
    });

    it('deve rejeitar transição inválida SCHEDULED → REJECTED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.SCHEDULED }));

      // Act & Assert
      await expect(service.reject(1, { rejectionReason: 'Motivo' }, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ── schedule ──────────────────────────────────────────
  describe('schedule', () => {
    it('deve permitir transição válida APPROVED → SCHEDULED', async () => {
      // Arrange
      const scheduledStart = new Date('2026-05-15T08:00:00Z');
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.APPROVED }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.SCHEDULED, assignedToId: 2, scheduledStart }));

      // Act
      const result = await service.schedule(1, { assignedToId: 2, scheduledStart }, ACTOR_ID);

      // Assert
      expect(result.status).toBe(WorkOrderStatus.SCHEDULED);
    });

    it('deve rejeitar agendamento de OS não aprovada', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REQUESTED }));

      // Act & Assert
      await expect(
        service.schedule(1, { assignedToId: 2, scheduledStart: new Date() }, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── start + SLA ────────────────────────────────────────
  describe('start', () => {
    it('deve registrar startedAt ao mover para IN_PROGRESS', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.SCHEDULED }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.IN_PROGRESS, startedAt: new Date() }));

      // Act
      const result = await service.start(1, ACTOR_ID);

      // Assert
      expect(result.status).toBe(WorkOrderStatus.IN_PROGRESS);
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ startedAt: expect.any(Date) }));
    });

    it('deve gerar Notification OVERDUE_WORK_ORDER quando SLA for ultrapassado', async () => {
      // Arrange — OS criada há 10 horas, prioridade HIGH (SLA = 8h)
      const oldCreatedAt = new Date();
      oldCreatedAt.setHours(oldCreatedAt.getHours() - 10);
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.SCHEDULED, priority: Priority.HIGH, createdAt: oldCreatedAt }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.IN_PROGRESS }));

      // Act
      await service.start(1, ACTOR_ID);

      // Assert
      expect(notifications.notify).toHaveBeenCalledWith(
        ACTOR_ID,
        expect.anything(),
        expect.stringContaining('fora do SLA'),
        expect.objectContaining({ workOrderId: 1 }),
      );
    });

    it('não deve gerar notificação quando SLA respeitado', async () => {
      // Arrange — OS criada há 1 hora, prioridade HIGH (SLA = 8h)
      const recentCreatedAt = new Date();
      recentCreatedAt.setHours(recentCreatedAt.getHours() - 1);
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.SCHEDULED, priority: Priority.HIGH, createdAt: recentCreatedAt }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.IN_PROGRESS }));

      // Act
      await service.start(1, ACTOR_ID);

      // Assert
      expect(notifications.notify).not.toHaveBeenCalled();
    });
  });

  // ── complete ──────────────────────────────────────────
  describe('complete', () => {
    it('deve registrar completedAt ao mover para COMPLETED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.IN_PROGRESS }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.COMPLETED, completedAt: new Date() }));

      // Act
      const result = await service.complete(1, { closingNotes: 'Concluído' }, ACTOR_ID);

      // Assert
      expect(result.status).toBe(WorkOrderStatus.COMPLETED);
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ completedAt: expect.any(Date), closingNotes: 'Concluído' }));
    });

    it('deve chamar decrementOnComplete ao completar', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.IN_PROGRESS }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.COMPLETED }));

      // Act
      await service.complete(1, { closingNotes: 'OK' }, ACTOR_ID);

      // Assert
      expect(spareParts.decrementOnComplete).toHaveBeenCalledWith(1, ACTOR_ID);
    });
  });

  // ── addWorkOrderPart (status check) ──────────────────
  describe('addWorkOrderPart', () => {
    it('deve rejeitar adição de WorkOrderPart em OS com status COMPLETED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.COMPLETED }));

      // Act & Assert
      await expect(service.addWorkOrderPart(1, 1, 2)).rejects.toThrow(BadRequestException);
    });

    it('deve permitir adição de WorkOrderPart em OS não concluída', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.IN_PROGRESS }));
      spareParts.addWorkOrderPart.mockResolvedValue({
        id: 1, workOrderId: 1, sparePartId: 1,
        sparePart: { id: 1, name: 'Rolamento', partNumber: 'ROL-01' },
        quantityUsed: 2, createdAt: new Date(),
      });

      // Act
      const result = await service.addWorkOrderPart(1, 1, 2);

      // Assert
      expect(result.quantityUsed).toBe(2);
    });
  });

  // ── transições terminais ─────────────────────────────
  describe('transições terminais', () => {
    it('deve rejeitar qualquer transição a partir de COMPLETED', async () => {
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.COMPLETED }));
      await expect(service.approve(1, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar qualquer transição a partir de CANCELLED', async () => {
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.CANCELLED }));
      await expect(service.approve(1, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });
  });
});
