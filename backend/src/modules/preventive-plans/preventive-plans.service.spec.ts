import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { PreventivePlansService } from './preventive-plans.service';
import { PreventivePlansRepository } from './preventive-plans.repository';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import type { PreventivePlanRecord } from './preventive-plans.repository';

// ─────────────────────── Fixtures ────────────────────────
const ACTOR_ID = 99;
const DAY_MS = 24 * 60 * 60 * 1000;

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
            hasOpenWorkOrder: jest.fn().mockResolvedValue(false),
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
        nextDueAt: new Date(Date.now() + DAY_MS).toISOString(),
      });

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ nextDueAt: expect.any(Date) }),
      );
    });

    it('deve aceitar próxima execução hoje', async () => {
      // Arrange
      repo.create.mockResolvedValue(makePlan());

      // Act
      await service.create({ name: 'Revisão', assetId: 1, intervalDays: 30, nextDueAt: new Date().toISOString() });

      // Assert
      expect(repo.create).toHaveBeenCalled();
    });

    it('deve rejeitar próxima execução antes de hoje', async () => {
      // Arrange
      const yesterday = new Date(Date.now() - DAY_MS).toISOString();

      // Act & Assert
      await expect(
        service.create({ name: 'Revisão', assetId: 1, intervalDays: 30, nextDueAt: yesterday }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
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

    it('deve permitir editar plano atrasado sem mexer na próxima execução', async () => {
      // Arrange
      const overdue = makePlan({ nextDueAt: new Date(Date.now() - 10 * DAY_MS) });
      repo.findById.mockResolvedValue(overdue);
      repo.update.mockResolvedValue(overdue);

      // Act
      await service.update(1, { name: 'Lubrificação' });

      // Assert
      expect(repo.update).toHaveBeenCalledWith(1, { name: 'Lubrificação' });
    });

    it('deve rejeitar nova próxima execução antes de hoje', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makePlan());
      const yesterday = new Date(Date.now() - DAY_MS).toISOString();

      // Act & Assert
      await expect(service.update(1, { nextDueAt: yesterday })).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
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
    const NOW = new Date('2026-06-15T12:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(NOW);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('deve criar uma OS preventiva vinculada ao plano para cada plano vencido', async () => {
      // Arrange
      const plans = [makePlan({ id: 1 }), makePlan({ id: 2, name: 'Revisão prensa' })];
      repo.findDue.mockResolvedValue(plans);
      workOrdersService.create.mockResolvedValue({} as never);
      repo.update.mockResolvedValue(makePlan());

      // Act
      const result = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(result).toEqual({ generated: 2, skipped: 0, failedPlans: [] });
      expect(workOrdersService.create).toHaveBeenCalledTimes(2);
      expect(workOrdersService.create).toHaveBeenCalledWith(expect.anything(), ACTOR_ID, 1);
      expect(workOrdersService.create).toHaveBeenCalledWith(expect.anything(), ACTOR_ID, 2);
    });

    it('deve avançar nextDueAt em intervalDays quando um ciclo basta para passar de hoje', async () => {
      // Arrange
      const plan = makePlan({ intervalDays: 30, nextDueAt: new Date('2026-06-01T00:00:00.000Z') });
      repo.findDue.mockResolvedValue([plan]);
      workOrdersService.create.mockResolvedValue({} as never);
      repo.update.mockResolvedValue(makePlan());

      // Act
      await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(repo.update).toHaveBeenCalledWith(plan.id, {
        nextDueAt: new Date('2026-07-01T00:00:00.000Z'),
        lastGeneratedAt: NOW,
      });
    });

    it('deve avançar nextDueAt em vários ciclos até passar de hoje, gerando uma única OS', async () => {
      // Arrange — vencido há ~3 ciclos de 30 dias
      const plan = makePlan({ intervalDays: 30, nextDueAt: new Date('2026-03-01T00:00:00.000Z') });
      repo.findDue.mockResolvedValue([plan]);
      workOrdersService.create.mockResolvedValue({} as never);
      repo.update.mockResolvedValue(makePlan());

      // Act
      const result = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert — 03-01 → 03-31 → 04-30 → 05-30 → 06-29
      expect(result.generated).toBe(1);
      expect(workOrdersService.create).toHaveBeenCalledTimes(1);
      const { nextDueAt } = repo.update.mock.calls[0][1];
      expect(nextDueAt).toEqual(new Date('2026-06-29T00:00:00.000Z'));
      expect(nextDueAt!.getTime()).toBeGreaterThan(NOW.getTime());
    });

    it('não deve gerar OS quando o plano já tiver uma OS aberta, mas deve contá-lo como pulado e avançar nextDueAt', async () => {
      // Arrange
      const plan = makePlan({ intervalDays: 30, nextDueAt: new Date('2026-06-01T00:00:00.000Z') });
      repo.findDue.mockResolvedValue([plan]);
      repo.hasOpenWorkOrder.mockResolvedValue(true);
      repo.update.mockResolvedValue(makePlan());

      // Act
      const result = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(result).toEqual({ generated: 0, skipped: 1, failedPlans: [] });
      expect(workOrdersService.create).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(plan.id, {
        nextDueAt: new Date('2026-07-01T00:00:00.000Z'),
      });
    });

    it('não deve duplicar OS ao gerar duas vezes seguidas', async () => {
      // Arrange — na segunda rodada a OS da primeira já está aberta
      const plan = makePlan({ nextDueAt: new Date('2026-06-01T00:00:00.000Z') });
      repo.findDue.mockResolvedValue([plan]);
      repo.hasOpenWorkOrder.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      workOrdersService.create.mockResolvedValue({} as never);
      repo.update.mockResolvedValue(makePlan());

      // Act
      const first = await service.generateDueWorkOrders(ACTOR_ID);
      const second = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(first.generated).toBe(1);
      expect(second).toEqual({ generated: 0, skipped: 1, failedPlans: [] });
      expect(workOrdersService.create).toHaveBeenCalledTimes(1);
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
      const result = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert — o primeiro falha e é reportado; o segundo gera
      expect(result).toEqual({ generated: 1, skipped: 0, failedPlans: ['Plano que falha'] });
    });

    it('deve reportar a falha em vez de dizer que não há plano vencido', async () => {
      // Arrange — ex.: coluna ausente por migration não aplicada
      repo.findDue.mockResolvedValue([makePlan({ name: 'Lubrificação mensal' })]);
      repo.hasOpenWorkOrder.mockRejectedValue(new Error('column "preventivePlanId" does not exist'));

      // Act
      const result = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(result).toEqual({ generated: 0, skipped: 0, failedPlans: ['Lubrificação mensal'] });
    });

    it('deve considerar vencido o plano de hoje gravado ao meio-dia, mesmo gerando antes desse horário', async () => {
      // Arrange — agora 15/06 09:00 em Brasília; vence 15/06 meio-dia local (15:00Z)
      jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
      const plan = makePlan({ nextDueAt: new Date('2026-06-15T15:00:00.000Z') });
      repo.findDue.mockResolvedValue([plan]);
      workOrdersService.create.mockResolvedValue({} as never);
      repo.update.mockResolvedValue(makePlan());

      // Act
      const result = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(result.generated).toBe(1);
    });

    it('não deve considerar vencido o plano de amanhã', async () => {
      // Arrange — o repositório traz até amanhã; o corte por dia é do service
      const plan = makePlan({ nextDueAt: new Date('2026-06-16T15:00:00.000Z') });
      repo.findDue.mockResolvedValue([plan]);

      // Act
      const result = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(result).toEqual({ generated: 0, skipped: 0, failedPlans: [] });
      expect(workOrdersService.create).not.toHaveBeenCalled();
    });

    it('deve retornar 0 quando não houver planos vencidos', async () => {
      // Arrange
      repo.findDue.mockResolvedValue([]);

      // Act
      const result = await service.generateDueWorkOrders(ACTOR_ID);

      // Assert
      expect(result).toEqual({ generated: 0, skipped: 0, failedPlans: [] });
      expect(workOrdersService.create).not.toHaveBeenCalled();
    });
  });
});
