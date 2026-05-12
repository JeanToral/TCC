import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Priority, WorkOrderStatus, WorkOrderType as WorkOrderTypeEnum } from '../../generated/prisma';

import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersRepository } from './work-orders.repository';
import type { WorkOrderRecord } from './work-orders.repository';

// ─────────────────────── Fixtures ────────────────────────
const mockAsset = { id: 1, name: 'Torno CNC 01', tag: 'MQ-001', location: 'Usinagem' };
const mockRole = { id: 1, name: 'Engineer', description: null, permissions: ['workorder.create'], isSystem: false };
const mockUser = {
  id: 1, name: 'Eng. Costa', email: 'eng@cmms.local',
  isActive: true, roleId: 1, role: mockRole,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), deletedAt: null,
};

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
      ],
    }).compile();

    service = module.get(WorkOrdersService);
    repo = module.get(WorkOrdersRepository);
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
      const result = await service.approve(1);

      // Assert
      expect(result.status).toBe(WorkOrderStatus.APPROVED);
      expect(repo.update).toHaveBeenCalledWith(1, { status: WorkOrderStatus.APPROVED });
    });

    it('deve rejeitar transição inválida COMPLETED → APPROVED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.COMPLETED }));

      // Act & Assert
      await expect(service.approve(1)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar transição inválida REJECTED → APPROVED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REJECTED }));

      // Act & Assert
      await expect(service.approve(1)).rejects.toThrow(BadRequestException);
    });
  });

  // ── reject ────────────────────────────────────────────
  describe('reject', () => {
    it('deve rejeitar OS com motivo obrigatório', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REQUESTED }));
      repo.update.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REJECTED, rejectionReason: 'Sem orçamento' }));

      // Act
      const result = await service.reject(1, { rejectionReason: 'Sem orçamento' });

      // Assert
      expect(result.status).toBe(WorkOrderStatus.REJECTED);
      expect(repo.update).toHaveBeenCalledWith(1, {
        status: WorkOrderStatus.REJECTED,
        rejectionReason: 'Sem orçamento',
      });
    });

    it('deve rejeitar transição inválida SCHEDULED → REJECTED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.SCHEDULED }));

      // Act & Assert
      await expect(service.reject(1, { rejectionReason: 'Motivo qualquer' })).rejects.toThrow(BadRequestException);
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
      const result = await service.schedule(1, { assignedToId: 2, scheduledStart });

      // Assert
      expect(result.status).toBe(WorkOrderStatus.SCHEDULED);
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: WorkOrderStatus.SCHEDULED,
        assignedToId: 2,
        scheduledStart,
      }));
    });

    it('deve rejeitar agendamento de OS não aprovada', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.REQUESTED }));

      // Act & Assert
      await expect(
        service.schedule(1, { assignedToId: 2, scheduledStart: new Date() }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── state machine — transições terminais ─────────────
  describe('transições terminais', () => {
    it('deve rejeitar qualquer transição a partir de COMPLETED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.COMPLETED }));

      // Act & Assert
      await expect(service.approve(1)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar qualquer transição a partir de CANCELLED', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeWorkOrder({ status: WorkOrderStatus.CANCELLED }));

      // Act & Assert
      await expect(service.approve(1)).rejects.toThrow(BadRequestException);
    });
  });
});
