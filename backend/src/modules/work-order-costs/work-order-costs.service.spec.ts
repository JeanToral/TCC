import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { WorkOrderStatus } from '../../generated/prisma';

import { AuditLogService } from '../audit-log/audit-log.service';
import { WorkOrderCostsRepository } from './work-order-costs.repository';
import { WorkOrderCostsService } from './work-order-costs.service';
import type { ExternalCostRecord } from './work-order-costs.repository';

// ─────────────────────── Fixtures ────────────────────────
const ACTOR_ID = 99;

const makeCost = (
  overrides: Partial<ExternalCostRecord> = {},
): ExternalCostRecord => ({
  id: 1,
  workOrderId: 10,
  description: 'Retífica do motor',
  supplier: 'Retificadora Oeste',
  amount: 4200,
  incurredAt: new Date('2026-03-10'),
  createdById: ACTOR_ID,
  createdAt: new Date('2026-03-25'),
  updatedAt: new Date('2026-03-25'),
  ...overrides,
});

const addInput = {
  workOrderId: 10,
  description: 'Retífica do motor',
  supplier: 'Retificadora Oeste',
  amount: 4200,
  incurredAt: new Date('2026-03-10'),
};

// ─────────────────────── Suite ───────────────────────────
describe('WorkOrderCostsService', () => {
  let service: WorkOrderCostsService;
  let repo: jest.Mocked<WorkOrderCostsRepository>;
  let audit: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderCostsService,
        {
          provide: WorkOrderCostsRepository,
          useValue: {
            findByWorkOrder: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn().mockResolvedValue(undefined),
            findWorkOrderStatus: jest.fn(),
            findCostInputs: jest.fn(),
          } satisfies Partial<jest.Mocked<WorkOrderCostsRepository>>,
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(WorkOrderCostsService);
    repo = module.get(WorkOrderCostsRepository);
    audit = module.get(AuditLogService);
  });

  // ── add ───────────────────────────────────────────────
  describe('add', () => {
    it('deve permitir lançar custo externo em OS em andamento', async () => {
      // Arrange
      repo.findWorkOrderStatus.mockResolvedValue(WorkOrderStatus.IN_PROGRESS);
      repo.create.mockResolvedValue(makeCost());

      // Act
      const result = await service.add(addInput, ACTOR_ID);

      // Assert
      expect(result.amount).toBe(4200);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ workOrderId: 10, createdById: ACTOR_ID }),
      );
    });

    it('deve permitir lançar custo externo em OS já concluída', async () => {
      // Arrange — a nota do fornecedor chega depois do fechamento (ADR 0001)
      repo.findWorkOrderStatus.mockResolvedValue(WorkOrderStatus.COMPLETED);
      repo.create.mockResolvedValue(makeCost());

      // Act
      const result = await service.add(addInput, ACTOR_ID);

      // Assert
      expect(result.id).toBe(1);
    });

    it('deve registrar AuditLog ao lançar custo em OS concluída', async () => {
      // Arrange
      repo.findWorkOrderStatus.mockResolvedValue(WorkOrderStatus.COMPLETED);
      repo.create.mockResolvedValue(makeCost());

      // Act
      await service.add(addInput, ACTOR_ID);

      // Assert
      expect(audit.log).toHaveBeenCalledWith(
        ACTOR_ID,
        'workordercost.create',
        'WorkOrderExternalCost',
        1,
        null,
        expect.objectContaining({ amount: 4200 }),
      );
    });

    it('não deve registrar AuditLog quando a OS ainda está aberta', async () => {
      // Arrange
      repo.findWorkOrderStatus.mockResolvedValue(WorkOrderStatus.IN_PROGRESS);
      repo.create.mockResolvedValue(makeCost());

      // Act
      await service.add(addInput, ACTOR_ID);

      // Assert
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('deve rejeitar lançamento em OS CANCELLED', async () => {
      // Arrange
      repo.findWorkOrderStatus.mockResolvedValue(WorkOrderStatus.CANCELLED);

      // Act & Assert
      await expect(service.add(addInput, ACTOR_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar lançamento em OS REJECTED', async () => {
      // Arrange
      repo.findWorkOrderStatus.mockResolvedValue(WorkOrderStatus.REJECTED);

      // Act & Assert
      await expect(service.add(addInput, ACTOR_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve rejeitar lançamento em OS inexistente', async () => {
      // Arrange
      repo.findWorkOrderStatus.mockResolvedValue(null);

      // Act & Assert
      await expect(service.add(addInput, ACTOR_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── update ────────────────────────────────────────────
  describe('update', () => {
    it('deve atualizar o lançamento e registrar AuditLog em OS concluída', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeCost());
      repo.findWorkOrderStatus.mockResolvedValue(WorkOrderStatus.COMPLETED);
      repo.update.mockResolvedValue(makeCost({ amount: 4500 }));

      // Act
      const result = await service.update(1, { amount: 4500 }, ACTOR_ID);

      // Assert
      expect(result.amount).toBe(4500);
      expect(audit.log).toHaveBeenCalledWith(
        ACTOR_ID,
        'workordercost.update',
        'WorkOrderExternalCost',
        1,
        expect.objectContaining({ amount: 4200 }),
        expect.objectContaining({ amount: 4500 }),
      );
    });

    it('deve rejeitar atualização de lançamento inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(99, { amount: 1 }, ACTOR_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ────────────────────────────────────────────
  describe('remove', () => {
    it('deve remover o lançamento e registrar AuditLog em OS concluída', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeCost());
      repo.findWorkOrderStatus.mockResolvedValue(WorkOrderStatus.COMPLETED);

      // Act
      await service.remove(1, ACTOR_ID);

      // Assert
      expect(repo.remove).toHaveBeenCalledWith(1);
      expect(audit.log).toHaveBeenCalledWith(
        ACTOR_ID,
        'workordercost.delete',
        'WorkOrderExternalCost',
        1,
        expect.objectContaining({ amount: 4200 }),
        null,
      );
    });
  });

  // ── getBreakdown ──────────────────────────────────────
  describe('getBreakdown', () => {
    it('deve compor peças, mão de obra e serviços externos', async () => {
      // Arrange — 2 × 100 em peças, 3h × 45 em mão de obra, 380 de frete
      repo.findCostInputs.mockResolvedValue({
        laborHours: 3,
        laborRateSnapshot: 45,
        costIsComplete: true,
        parts: [{ quantityUsed: 2, unitCostSnapshot: 100 }],
        externalAmounts: [380],
      });

      // Act
      const result = await service.getBreakdown(10);

      // Assert
      expect(result.partsCost).toBe(200);
      expect(result.laborCost).toBe(135);
      expect(result.externalCost).toBe(380);
      expect(result.total).toBe(715);
      expect(result.isComplete).toBe(true);
    });

    it('deve tratar unitCostSnapshot nulo como zero', async () => {
      // Arrange
      repo.findCostInputs.mockResolvedValue({
        laborHours: null,
        laborRateSnapshot: null,
        costIsComplete: false,
        parts: [
          { quantityUsed: 2, unitCostSnapshot: null },
          { quantityUsed: 1, unitCostSnapshot: 50 },
        ],
        externalAmounts: [],
      });

      // Act
      const result = await service.getBreakdown(10);

      // Assert
      expect(result.partsCost).toBe(50);
      expect(result.total).toBe(50);
      expect(result.isComplete).toBe(false);
    });

    it('deve tratar taxa horária nula como zero sem quebrar', async () => {
      // Arrange
      repo.findCostInputs.mockResolvedValue({
        laborHours: 4,
        laborRateSnapshot: null,
        costIsComplete: false,
        parts: [],
        externalAmounts: [],
      });

      // Act
      const result = await service.getBreakdown(10);

      // Assert
      expect(result.laborCost).toBe(0);
      expect(result.isComplete).toBe(false);
    });

    it('deve somar vários lançamentos externos', async () => {
      // Arrange — retífica + frete + locação de talha
      repo.findCostInputs.mockResolvedValue({
        laborHours: null,
        laborRateSnapshot: null,
        costIsComplete: true,
        parts: [],
        externalAmounts: [4200, 380, 1100],
      });

      // Act
      const result = await service.getBreakdown(10);

      // Assert
      expect(result.externalCost).toBe(5680);
      expect(result.total).toBe(5680);
    });

    it('deve lançar NotFoundException para OS inexistente', async () => {
      // Arrange
      repo.findCostInputs.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getBreakdown(99)).rejects.toThrow(NotFoundException);
    });
  });
});
