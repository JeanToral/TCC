import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { PreventivePlansService } from './preventive-plans.service';
import { PreventivePlansRepository } from './preventive-plans.repository';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import type { PreventivePlanRecord } from './preventive-plans.repository';

// ─────────────────────── Fixtures ────────────────────────
const ACTOR_ID = 99;

const makeAsset = () => ({ id: 1, name: 'Torno CNC 01', tag: 'MQ-001' });

const makePlan = (overrides: Partial<PreventivePlanRecord> = {}): PreventivePlanRecord => ({
  id: 1,
  name: 'Revisão mensal do Torno',
  description: 'Verificação geral de componentes',
  assetId: 1,
  asset: makeAsset(),
  intervalDays: 30,
  lastGeneratedAt: null,
  nextDueAt: new Date('2026-05-01'),
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

// ─────────────────────── Suite ───────────────────────────
describe('PreventivePlansService', () => {
  let service: PreventivePlansService;
  let repo: jest.Mocked<PreventivePlansRepository>;
  let workOrdersService: jest.Mocked<WorkOrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreventivePlansService,
        {
          provide: PreventivePlansRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findDue: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          } satisfies Partial<jest.Mocked<PreventivePlansRepository>>,
        },
        {
          provide: WorkOrdersService,
          useValue: {
            create: jest.fn(),
          } satisfies Partial<jest.Mocked<WorkOrdersService>>,
        },
      ],
    }).compile();

    service = module.get(PreventivePlansService);
    repo = module.get(PreventivePlansRepository);
    workOrdersService = module.get(WorkOrdersService);
  });

  // ── findById ─────────────────────────────────────────────

  describe('findById', () => {
    it('deve retornar o plano quando encontrado', async () => {
      // Arrange
      const plan = makePlan();
      repo.findById.mockResolvedValue(plan);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result).toEqual(plan);
    });

    it('deve lançar NotFoundException para plano inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────

  describe('create', () => {
    it('deve criar o plano convertendo nextDueAt para Date', async () => {
      // Arrange
      const plan = makePlan();
      repo.create.mockResolvedValue(plan);

      // Act
      await service.create({
        name: 'Revisão mensal do Torno',
        assetId: 1,
        intervalDays: 30,
        nextDueAt: '2026-05-01T00:00:00.000Z',
      });

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ nextDueAt: expect.any(Date) }),
      );
    });
  });

  // ── update ───────────────────────────────────────────────

  describe('update', () => {
    it('deve lançar NotFoundException ao atualizar plano inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, { name: 'Novo Nome' })).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('deve atualizar o plano existente', async () => {
      // Arrange
      const updated = makePlan({ name: 'Revisão trimestral' });
      repo.findById.mockResolvedValue(makePlan());
      repo.update.mockResolvedValue(updated);

      // Act
      const result = await service.update(1, { name: 'Revisão trimestral' });

      // Assert
      expect(result.name).toBe('Revisão trimestral');
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Revisão trimestral' }));
    });
  });

  // ── delete ───────────────────────────────────────────────

  describe('delete', () => {
    it('deve lançar NotFoundException ao deletar plano inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('deve deletar o plano existente', async () => {
      // Arrange
      const plan = makePlan();
      repo.findById.mockResolvedValue(plan);
      repo.delete.mockResolvedValue(plan);

      // Act
      const result = await service.delete(1);

      // Assert
      expect(result).toEqual(plan);
      expect(repo.delete).toHaveBeenCalledWith(1);
    });
  });

  // ── generateDueWorkOrders ────────────────────────────────

  describe('generateDueWorkOrders', () => {
    it('deve criar uma OS preventiva para cada plano vencido', async () => {
      // Arrange
      const plans = [makePlan({ id: 1 }), makePlan({ id: 2, name: 'Revisão prensa' })];
      repo.findDue.mockResolvedValue(plans);
      workOrdersService.create.mockResolvedValue({} as never);
      repo.update.mockResolvedValue(makePlan());

      // Act
      const count = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(workOrdersService.create).toHaveBeenCalledTimes(2);
      expect(count).toBe(2);
    });

    it('deve avançar nextDueAt em intervalDays após gerar a OS', async () => {
      // Arrange
      const nextDueAt = new Date('2026-05-01T00:00:00.000Z');
      const plan = makePlan({ intervalDays: 30, nextDueAt });
      repo.findDue.mockResolvedValue([plan]);
      workOrdersService.create.mockResolvedValue({} as never);
      repo.update.mockResolvedValue(makePlan());

      // Act
      await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      const expectedNext = new Date('2026-05-31T00:00:00.000Z');
      expect(repo.update).toHaveBeenCalledWith(
        plan.id,
        expect.objectContaining({
          nextDueAt: expectedNext,
          lastGeneratedAt: expect.any(Date),
        }),
      );
    });

    it('deve continuar gerando OS dos demais planos quando um falhar', async () => {
      // Arrange
      const plans = [
        makePlan({ id: 1, name: 'Plano que falha' }),
        makePlan({ id: 2, name: 'Plano OK' }),
      ];
      repo.findDue.mockResolvedValue(plans);
      workOrdersService.create
        .mockRejectedValueOnce(new Error('Ativo não encontrado'))
        .mockResolvedValueOnce({} as never);
      repo.update.mockResolvedValue(makePlan());

      // Act
      const count = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert — apenas o segundo plano gerou OS com sucesso
      expect(count).toBe(1);
    });

    it('deve retornar 0 quando não houver planos vencidos', async () => {
      // Arrange
      repo.findDue.mockResolvedValue([]);

      // Act
      const count = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(count).toBe(0);
      expect(workOrdersService.create).not.toHaveBeenCalled();
    });
  });
});
