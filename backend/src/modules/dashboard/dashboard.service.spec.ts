import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderStatus, WorkOrderType } from '../../generated/prisma';

import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';
import type {
  CompletedTrendRecord,
  CorrectiveWorkOrderRecord,
  SlaDetailRecord,
} from './dashboard.repository';

const makeWo = (
  id: number,
  assetId: number,
  startedAt: Date | null,
  completedAt: Date | null,
  assetName = 'Máquina A',
): CorrectiveWorkOrderRecord => ({
  id,
  assetId,
  startedAt,
  completedAt,
  asset: { id: assetId, name: assetName },
});

const hours = (h: number) => h * 3_600_000;

const makeCompleted = (
  overrides: Partial<CompletedTrendRecord> = {},
): CompletedTrendRecord => ({
  id: 1,
  type: WorkOrderType.CORRECTIVE,
  priority: 'HIGH',
  createdAt: new Date('2026-05-10T12:00:00Z'),
  startedAt: new Date('2026-05-10T13:00:00Z'),
  completedAt: new Date('2026-05-11T12:00:00Z'),
  ...overrides,
});

const MAY_TO_JULY = {
  from: new Date('2026-05-01T03:00:00Z'),
  to: new Date('2026-07-31T23:00:00Z'),
};

describe('DashboardService', () => {
  let service: DashboardService;
  let repo: jest.Mocked<DashboardRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: DashboardRepository,
          useValue: {
            findCorrectiveCompleted: jest.fn(),
            countAllByAsset: jest.fn(),
            findCompletedForSla: jest.fn().mockResolvedValue([]),
            countByStatus: jest.fn().mockResolvedValue([]),
            findCreatedDates: jest.fn().mockResolvedValue([]),
            findCompletedForTrend: jest.fn().mockResolvedValue([]),
            findCompletedSlaDetail: jest.fn().mockResolvedValue([]),
            findPartsBelowMinimum: jest.fn().mockResolvedValue([]),
            findPartsByIds: jest.fn().mockResolvedValue([]),
            sumConsumption: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
    repo = module.get(DashboardRepository);
  });

  describe('getKpis', () => {
    it('deve retornar array vazio quando não há OS corretivas concluídas', async () => {
      // Arrange
      repo.findCorrectiveCompleted.mockResolvedValue([]);

      // Act
      const result = await service.getKpis();

      // Assert
      expect(result).toEqual([]);
      expect(repo.countAllByAsset).not.toHaveBeenCalled();
    });

    it('deve calcular MTTR corretamente como média dos tempos de reparo em horas', async () => {
      // Arrange
      const base = new Date('2024-01-01T00:00:00Z');
      const wos = [
        // 2h de reparo
        makeWo(1, 10, new Date(base.getTime()), new Date(base.getTime() + hours(2))),
        // 4h de reparo
        makeWo(2, 10, new Date(base.getTime() + hours(10)), new Date(base.getTime() + hours(14))),
      ];
      repo.findCorrectiveCompleted.mockResolvedValue(wos);
      repo.countAllByAsset.mockResolvedValue(new Map([[10, 5]]));

      // Act
      const result = await service.getKpis();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].mttr).toBeCloseTo(3); // (2 + 4) / 2 = 3h
    });

    it('deve calcular MTBF como média dos intervalos entre falhas consecutivas', async () => {
      // Arrange
      const base = new Date('2024-01-01T00:00:00Z');
      const wos = [
        // Falha 1: startedAt=0h, completedAt=2h
        makeWo(1, 10, new Date(base.getTime()), new Date(base.getTime() + hours(2))),
        // Falha 2: startedAt=10h, completedAt=14h → intervalo desde completedAt da falha 1 = 8h
        makeWo(2, 10, new Date(base.getTime() + hours(10)), new Date(base.getTime() + hours(14))),
        // Falha 3: startedAt=20h, completedAt=22h → intervalo = 6h
        makeWo(3, 10, new Date(base.getTime() + hours(20)), new Date(base.getTime() + hours(22))),
      ];
      repo.findCorrectiveCompleted.mockResolvedValue(wos);
      repo.countAllByAsset.mockResolvedValue(new Map([[10, 3]]));

      // Act
      const result = await service.getKpis();

      // Assert
      expect(result[0].mtbf).toBeCloseTo(7); // (8 + 6) / 2 = 7h
    });

    it('deve retornar mtbf null quando há apenas uma OS concluída', async () => {
      // Arrange
      const base = new Date('2024-01-01T00:00:00Z');
      const wos = [makeWo(1, 10, new Date(base.getTime()), new Date(base.getTime() + hours(2)))];
      repo.findCorrectiveCompleted.mockResolvedValue(wos);
      repo.countAllByAsset.mockResolvedValue(new Map([[10, 1]]));

      // Act
      const result = await service.getKpis();

      // Assert
      expect(result[0].mtbf).toBeNull();
    });

    it('deve retornar mttr null quando nenhuma OS tem startedAt e completedAt', async () => {
      // Arrange
      const wos = [makeWo(1, 10, null, null)];
      repo.findCorrectiveCompleted.mockResolvedValue(wos);
      repo.countAllByAsset.mockResolvedValue(new Map([[10, 1]]));

      // Act
      const result = await service.getKpis();

      // Assert
      expect(result[0].mttr).toBeNull();
    });

    it('deve agrupar KPIs por ativo corretamente', async () => {
      // Arrange
      const base = new Date('2024-01-01T00:00:00Z');
      const wos = [
        makeWo(1, 10, new Date(base.getTime()), new Date(base.getTime() + hours(1)), 'Máquina A'),
        makeWo(2, 10, new Date(base.getTime() + hours(5)), new Date(base.getTime() + hours(7)), 'Máquina A'),
        makeWo(3, 20, new Date(base.getTime()), new Date(base.getTime() + hours(3)), 'Máquina B'),
      ];
      repo.findCorrectiveCompleted.mockResolvedValue(wos);
      repo.countAllByAsset.mockResolvedValue(new Map([[10, 4], [20, 2]]));

      // Act
      const result = await service.getKpis();

      // Assert
      expect(result).toHaveLength(2);
      const assetA = result.find((r) => r.assetId === 10);
      const assetB = result.find((r) => r.assetId === 20);
      expect(assetA?.completedWorkOrders).toBe(2);
      expect(assetA?.totalWorkOrders).toBe(4);
      expect(assetB?.completedWorkOrders).toBe(1);
      expect(assetB?.totalWorkOrders).toBe(2);
    });

    it('deve passar o filtro de assetId e período ao repositório', async () => {
      // Arrange
      repo.findCorrectiveCompleted.mockResolvedValue([]);
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');

      // Act
      await service.getKpis({ assetId: 5, from, to });

      // Assert
      expect(repo.findCorrectiveCompleted).toHaveBeenCalledWith(5, from, to);
    });
  });

  describe('getSlaRate', () => {
    it('deve repassar o filtro de ativo ao repositório', async () => {
      // Arrange
      const from = new Date('2026-05-01');
      const to = new Date('2026-05-31');

      // Act
      await service.getSlaRate({ assetId: 3, from, to });

      // Assert
      expect(repo.findCompletedForSla).toHaveBeenCalledWith(from, to, 3);
    });

    it('deve contar dentro do SLA o início até o prazo da prioridade', async () => {
      // Arrange — HIGH = 8h: uma em 7h (dentro), uma em 9h (fora)
      const created = new Date('2026-05-10T00:00:00Z');
      repo.findCompletedForSla.mockResolvedValue([
        { id: 1, priority: 'HIGH', createdAt: created, startedAt: new Date(created.getTime() + hours(7)) },
        { id: 2, priority: 'HIGH', createdAt: created, startedAt: new Date(created.getTime() + hours(9)) },
      ]);

      // Act
      const result = await service.getSlaRate();

      // Assert
      expect(result).toEqual({ withinSla: 1, total: 2, percentage: 50 });
    });
  });

  describe('getStatusCounts', () => {
    it('deve devolver todos os status na ordem do fluxo, inclusive zerados', async () => {
      // Arrange
      repo.countByStatus.mockResolvedValue([
        { status: WorkOrderStatus.COMPLETED, count: 4 },
        { status: WorkOrderStatus.REQUESTED, count: 2 },
      ]);

      // Act
      const result = await service.getStatusCounts(MAY_TO_JULY);

      // Assert
      expect(result.map((r) => r.status)).toEqual([
        'REQUESTED',
        'APPROVED',
        'SCHEDULED',
        'IN_PROGRESS',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
      ]);
      expect(result.find((r) => r.status === WorkOrderStatus.REQUESTED)?.count).toBe(2);
      expect(result.find((r) => r.status === WorkOrderStatus.APPROVED)?.count).toBe(0);
    });

    it('deve repassar período e ativo ao repositório', async () => {
      // Act
      await service.getStatusCounts({ ...MAY_TO_JULY, assetId: 7 });

      // Assert
      expect(repo.countByStatus).toHaveBeenCalledWith(MAY_TO_JULY.from, MAY_TO_JULY.to, 7);
    });

    it('deve usar os últimos 6 meses quando não há período', async () => {
      // Act
      await service.getStatusCounts();

      // Assert
      const [from, to] = repo.countByStatus.mock.calls[0];
      const months =
        (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth();
      expect(months).toBeGreaterThanOrEqual(5);
      expect(months).toBeLessThanOrEqual(6);
    });

    it('deve rejeitar período invertido', async () => {
      await expect(
        service.getStatusCounts({ from: MAY_TO_JULY.to, to: MAY_TO_JULY.from }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMonthlyTrend', () => {
    it('deve devolver um ponto por mês, inclusive meses sem OS', async () => {
      // Act
      const result = await service.getMonthlyTrend(MAY_TO_JULY);

      // Assert
      expect(result.map((p) => p.month)).toEqual(['2026-05', '2026-06', '2026-07']);
      expect(result[1]).toEqual({
        month: '2026-06',
        opened: 0,
        completed: 0,
        completedCorrective: 0,
        completedPreventive: 0,
        slaWithin: 0,
        slaTotal: 0,
        slaPercentage: null,
      });
    });

    it('deve agrupar abertas por createdAt e concluídas por completedAt', async () => {
      // Arrange — aberta em maio, concluída em junho
      repo.findCreatedDates.mockResolvedValue([new Date('2026-05-20T12:00:00Z')]);
      repo.findCompletedForTrend.mockResolvedValue([
        makeCompleted({ completedAt: new Date('2026-06-02T12:00:00Z') }),
      ]);

      // Act
      const result = await service.getMonthlyTrend(MAY_TO_JULY);

      // Assert
      expect(result[0].opened).toBe(1);
      expect(result[0].completed).toBe(0);
      expect(result[1].completed).toBe(1);
    });

    it('deve agrupar no fuso da planta (31/05 23h em SP fica em maio)', async () => {
      // Arrange
      repo.findCompletedForTrend.mockResolvedValue([
        makeCompleted({ completedAt: new Date('2026-06-01T02:00:00Z') }),
      ]);

      // Act
      const result = await service.getMonthlyTrend(MAY_TO_JULY);

      // Assert
      expect(result[0].completed).toBe(1);
      expect(result[1].completed).toBe(0);
    });

    it('deve separar concluídas em corretivas e preventivas', async () => {
      // Arrange
      repo.findCompletedForTrend.mockResolvedValue([
        makeCompleted({ id: 1, type: WorkOrderType.CORRECTIVE }),
        makeCompleted({ id: 2, type: WorkOrderType.PREVENTIVE }),
        makeCompleted({ id: 3, type: WorkOrderType.PREVENTIVE }),
      ]);

      // Act
      const [may] = await service.getMonthlyTrend(MAY_TO_JULY);

      // Assert
      expect(may.completedCorrective).toBe(1);
      expect(may.completedPreventive).toBe(2);
    });

    it('deve calcular o % de SLA do mês', async () => {
      // Arrange — HIGH (8h): 1h dentro, 10h fora; sem início fica fora do total
      const created = new Date('2026-05-10T00:00:00Z');
      repo.findCompletedForTrend.mockResolvedValue([
        makeCompleted({ id: 1, createdAt: created, startedAt: new Date(created.getTime() + hours(1)) }),
        makeCompleted({ id: 2, createdAt: created, startedAt: new Date(created.getTime() + hours(10)) }),
        makeCompleted({ id: 3, createdAt: created, startedAt: null }),
      ]);

      // Act
      const [may] = await service.getMonthlyTrend(MAY_TO_JULY);

      // Assert
      expect(may.slaWithin).toBe(1);
      expect(may.slaTotal).toBe(2);
      expect(may.slaPercentage).toBe(50);
    });

    it('deve repassar o ativo aos dois levantamentos', async () => {
      // Act
      await service.getMonthlyTrend({ ...MAY_TO_JULY, assetId: 9 });

      // Assert
      expect(repo.findCreatedDates).toHaveBeenCalledWith(MAY_TO_JULY.from, MAY_TO_JULY.to, 9);
      expect(repo.findCompletedForTrend).toHaveBeenCalledWith(MAY_TO_JULY.from, MAY_TO_JULY.to, 9);
    });
  });

  describe('getSlaBreaches', () => {
    const created = new Date('2026-05-10T00:00:00Z');
    const makeDetail = (overrides: Partial<SlaDetailRecord> = {}): SlaDetailRecord => ({
      ...makeCompleted(),
      id: 1,
      title: 'Falha no motor',
      priority: 'HIGH',
      createdAt: created,
      startedAt: new Date(created.getTime() + hours(10)),
      asset: { id: 3, tag: 'TRN-001', name: 'Torno' },
      ...overrides,
    });

    it('deve listar só as OS que começaram depois do prazo, com o atraso em horas', async () => {
      // Arrange — HIGH = 8h: 10h está fora (2h de atraso), 5h está dentro
      repo.findCompletedSlaDetail.mockResolvedValue([
        makeDetail({ id: 1 }),
        makeDetail({ id: 2, startedAt: new Date(created.getTime() + hours(5)) }),
      ]);

      // Act
      const result = await service.getSlaBreaches(MAY_TO_JULY);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        workOrderId: 1,
        assetTag: 'TRN-001',
        priority: 'HIGH',
        limitHours: 8,
        delayHours: 2,
      });
    });

    it('deve ordenar do maior para o menor atraso', async () => {
      // Arrange — CRITICAL (2h) com 20h de atraso; HIGH (8h) com 2h
      repo.findCompletedSlaDetail.mockResolvedValue([
        makeDetail({ id: 1 }),
        makeDetail({
          id: 2,
          priority: 'CRITICAL',
          startedAt: new Date(created.getTime() + hours(22)),
        }),
      ]);

      // Act
      const result = await service.getSlaBreaches(MAY_TO_JULY);

      // Assert
      expect(result.map((r) => r.workOrderId)).toEqual([2, 1]);
    });

    it('deve repassar período e ativo ao repositório', async () => {
      // Act
      await service.getSlaBreaches({ ...MAY_TO_JULY, assetId: 3 });

      // Assert
      expect(repo.findCompletedSlaDetail).toHaveBeenCalledWith(
        MAY_TO_JULY.from,
        MAY_TO_JULY.to,
        3,
      );
    });
  });

  describe('getStockReport', () => {
    const part = (id: number, quantity: number, minimumStock: number) => ({
      id,
      partNumber: `P-${id}`,
      name: `Peça ${id}`,
      quantity,
      minimumStock,
    });

    it('deve juntar peças abaixo do mínimo e peças consumidas no período', async () => {
      // Arrange — peça 1 abaixo do mínimo sem consumo; peça 2 normal com consumo
      repo.findPartsBelowMinimum.mockResolvedValue([part(1, 2, 5)]);
      repo.sumConsumption.mockResolvedValue([{ sparePartId: 2, consumed: 6, workOrders: 3 }]);
      repo.findPartsByIds.mockResolvedValue([part(2, 20, 4)]);

      // Act
      const result = await service.getStockReport(MAY_TO_JULY);

      // Assert
      expect(result).toEqual([
        expect.objectContaining({ sparePartId: 1, belowMinimum: true, consumed: 0 }),
        expect.objectContaining({ sparePartId: 2, belowMinimum: false, consumed: 6, workOrders: 3 }),
      ]);
      expect(repo.findPartsByIds).toHaveBeenCalledWith([2]);
    });

    it('não deve buscar de novo a peça que já veio na lista de abaixo do mínimo', async () => {
      // Arrange
      repo.findPartsBelowMinimum.mockResolvedValue([part(1, 2, 5)]);
      repo.sumConsumption.mockResolvedValue([{ sparePartId: 1, consumed: 4, workOrders: 2 }]);

      // Act
      const result = await service.getStockReport(MAY_TO_JULY);

      // Assert
      expect(repo.findPartsByIds).not.toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({ sparePartId: 1, consumed: 4 })]);
    });

    it('deve ordenar abaixo do mínimo primeiro e depois por consumo', async () => {
      // Arrange
      repo.findPartsBelowMinimum.mockResolvedValue([part(3, 0, 1)]);
      repo.sumConsumption.mockResolvedValue([
        { sparePartId: 1, consumed: 2, workOrders: 1 },
        { sparePartId: 2, consumed: 9, workOrders: 4 },
      ]);
      repo.findPartsByIds.mockResolvedValue([part(1, 10, 1), part(2, 10, 1)]);

      // Act
      const result = await service.getStockReport(MAY_TO_JULY);

      // Assert
      expect(result.map((r) => r.sparePartId)).toEqual([3, 2, 1]);
    });

    it('deve filtrar o consumo por ativo e período', async () => {
      // Act
      await service.getStockReport({ ...MAY_TO_JULY, assetId: 4 });

      // Assert
      expect(repo.sumConsumption).toHaveBeenCalledWith(MAY_TO_JULY.from, MAY_TO_JULY.to, 4);
    });
  });
});
