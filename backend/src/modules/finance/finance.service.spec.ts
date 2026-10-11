import { Test, type TestingModule } from '@nestjs/testing';
import { WorkOrderType } from '../../generated/prisma';

import { FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';
import type {
  CompletedCostRow,
  ExternalCostRow,
  OpenCostRow,
} from './finance.repository';

// ─────────────────────── Fixtures ────────────────────────
const injetora = { id: 3, name: 'Injetora 03', tag: 'INJ-003' };
const torno = { id: 1, name: 'Torno CNC #1', tag: 'TRN-001' };

const makeCompleted = (
  overrides: Partial<CompletedCostRow> = {},
): CompletedCostRow => ({
  id: 1,
  assetId: injetora.id,
  asset: injetora,
  type: WorkOrderType.CORRECTIVE,
  completedAt: new Date('2026-05-10T12:00:00Z'),
  laborHours: 3,
  laborRateSnapshot: 45,
  costIsComplete: true,
  parts: [{ quantityUsed: 2, unitCostSnapshot: 100 }],
  ...overrides,
});

const makeExternal = (
  overrides: Partial<ExternalCostRow> = {},
): ExternalCostRow => ({
  amount: 380,
  incurredAt: new Date('2026-05-12T12:00:00Z'),
  workOrder: {
    assetId: injetora.id,
    asset: injetora,
    type: WorkOrderType.CORRECTIVE,
  },
  ...overrides,
});

const makeOpen = (overrides: Partial<OpenCostRow> = {}): OpenCostRow => ({
  assetId: injetora.id,
  asset: injetora,
  laborHours: 2,
  assignedTo: { hourlyRate: 50 },
  parts: [{ quantityUsed: 1, sparePart: { unitCost: 30 } }],
  externalCosts: [],
  ...overrides,
});

// ─────────────────────── Suite ───────────────────────────
describe('FinanceService', () => {
  let service: FinanceService;
  let repo: jest.Mocked<FinanceRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        {
          provide: FinanceRepository,
          useValue: {
            findCompleted: jest.fn().mockResolvedValue([]),
            findExternalCosts: jest.fn().mockResolvedValue([]),
            findOpen: jest.fn().mockResolvedValue([]),
          } satisfies Partial<jest.Mocked<FinanceRepository>>,
        },
      ],
    }).compile();

    service = module.get(FinanceService);
    repo = module.get(FinanceRepository);
  });

  it('deve somar peças usando unitCostSnapshot, não o unitCost atual', async () => {
    // Arrange — 2 × R$ 100 congelados
    repo.findCompleted.mockResolvedValue([makeCompleted()]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert
    expect(result.realizedPartsCost).toBe(200);
  });

  it('deve somar mão de obra como laborHours × laborRateSnapshot', async () => {
    // Arrange — 3h × R$ 45
    repo.findCompleted.mockResolvedValue([makeCompleted()]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert
    expect(result.realizedLaborCost).toBe(135);
  });

  it('deve compor o total realizado com peças, mão de obra e serviços externos', async () => {
    // Arrange
    repo.findCompleted.mockResolvedValue([makeCompleted()]);
    repo.findExternalCosts.mockResolvedValue([makeExternal()]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert — 200 + 135 + 380
    expect(result.realizedExternalCost).toBe(380);
    expect(result.realizedTotal).toBe(715);
  });

  it('deve incluir custo externo de ativo sem OS concluída no período', async () => {
    // Arrange — nota de competência março, OS fechada fora do recorte
    repo.findCompleted.mockResolvedValue([]);
    repo.findExternalCosts.mockResolvedValue([makeExternal({ amount: 4200 })]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert
    expect(result.assetTag).toBe('INJ-003');
    expect(result.realizedExternalCost).toBe(4200);
    expect(result.completedWorkOrders).toBe(0);
  });

  it('deve separar custo realizado de custo previsto', async () => {
    // Arrange
    repo.findCompleted.mockResolvedValue([makeCompleted()]);
    repo.findOpen.mockResolvedValue([makeOpen()]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert — previsto = 1 × 30 + 2h × 50 = 130, fora do realizado
    expect(result.realizedTotal).toBe(335);
    expect(result.forecastTotal).toBe(130);
  });

  it('deve precificar o previsto com os valores atuais, não congelados', async () => {
    // Arrange
    repo.findOpen.mockResolvedValue([
      makeOpen({
        parts: [{ quantityUsed: 3, sparePart: { unitCost: 150 } }],
        laborHours: null,
        assignedTo: null,
        externalCosts: [{ amount: 70 }],
      }),
    ]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert — 3 × 150 + 70
    expect(result.forecastTotal).toBe(520);
    expect(result.realizedTotal).toBe(0);
  });

  it('deve quebrar o custo realizado entre corretiva e preventiva', async () => {
    // Arrange
    repo.findCompleted.mockResolvedValue([
      makeCompleted({ id: 1, type: WorkOrderType.CORRECTIVE }),
      makeCompleted({
        id: 2,
        type: WorkOrderType.PREVENTIVE,
        laborHours: 1,
        laborRateSnapshot: 45,
        parts: [],
      }),
    ]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert
    expect(result.realizedCorrectiveCost).toBe(335);
    expect(result.realizedPreventiveCost).toBe(45);
    expect(result.realizedCorrectiveCost + result.realizedPreventiveCost).toBe(
      result.realizedTotal,
    );
  });

  it('deve atribuir o custo externo ao tipo da OS de origem', async () => {
    // Arrange
    repo.findExternalCosts.mockResolvedValue([
      makeExternal({
        amount: 1100,
        workOrder: {
          assetId: injetora.id,
          asset: injetora,
          type: WorkOrderType.PREVENTIVE,
        },
      }),
    ]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert
    expect(result.realizedPreventiveCost).toBe(1100);
    expect(result.realizedCorrectiveCost).toBe(0);
  });

  it('deve contar OS com custo incompleto na cobertura', async () => {
    // Arrange
    repo.findCompleted.mockResolvedValue([
      makeCompleted({ id: 1, costIsComplete: true }),
      makeCompleted({ id: 2, costIsComplete: false }),
      makeCompleted({ id: 3, costIsComplete: false }),
    ]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert
    expect(result.completedWorkOrders).toBe(3);
    expect(result.workOrdersWithIncompleteCost).toBe(2);
  });

  it('deve tratar unitCostSnapshot nulo como zero', async () => {
    // Arrange
    repo.findCompleted.mockResolvedValue([
      makeCompleted({
        costIsComplete: false,
        laborHours: null,
        laborRateSnapshot: null,
        parts: [
          { quantityUsed: 2, unitCostSnapshot: null },
          { quantityUsed: 1, unitCostSnapshot: 50 },
        ],
      }),
    ]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert
    expect(result.realizedPartsCost).toBe(50);
    expect(result.workOrdersWithIncompleteCost).toBe(1);
  });

  it('deve tratar taxa horária nula como zero', async () => {
    // Arrange
    repo.findCompleted.mockResolvedValue([
      makeCompleted({ laborHours: 4, laborRateSnapshot: null, parts: [] }),
    ]);

    // Act
    const [result] = await service.getAssetCosts();

    // Assert
    expect(result.realizedLaborCost).toBe(0);
  });

  it('deve agrupar por ativo e ordenar do mais caro para o mais barato', async () => {
    // Arrange
    repo.findCompleted.mockResolvedValue([
      makeCompleted({
        id: 1,
        assetId: torno.id,
        asset: torno,
        parts: [],
        laborHours: 1,
        laborRateSnapshot: 10,
      }),
      makeCompleted({ id: 2 }),
    ]);

    // Act
    const results = await service.getAssetCosts();

    // Assert
    expect(results).toHaveLength(2);
    expect(results[0].assetTag).toBe('INJ-003');
    expect(results[1].assetTag).toBe('TRN-001');
  });

  it('deve retornar lista vazia quando não há custo algum', async () => {
    // Act
    const results = await service.getAssetCosts();

    // Assert
    expect(results).toEqual([]);
  });

  it('deve repassar o filtro de ativo e período ao repositório', async () => {
    // Arrange
    const filter = {
      assetId: 3,
      from: new Date('2026-03-01'),
      to: new Date('2026-03-31'),
    };

    // Act
    await service.getAssetCosts(filter);

    // Assert
    expect(repo.findCompleted).toHaveBeenCalledWith(3, filter.from, filter.to);
    expect(repo.findExternalCosts).toHaveBeenCalledWith(
      3,
      filter.from,
      filter.to,
    );
    expect(repo.findOpen).toHaveBeenCalledWith(3);
  });

  // ── Série mensal ──────────────────────────────────────────
  describe('getMonthlyCosts', () => {
    const MAY_TO_JULY = {
      from: new Date('2026-05-01T03:00:00Z'),
      to: new Date('2026-07-31T23:00:00Z'),
    };

    it('deve devolver um ponto por mês, zerado quando não há custo', async () => {
      // Act
      const result = await service.getMonthlyCosts(MAY_TO_JULY);

      // Assert
      expect(result).toEqual([
        { month: '2026-05', corrective: 0, preventive: 0, total: 0, workOrdersWithIncompleteCost: 0 },
        { month: '2026-06', corrective: 0, preventive: 0, total: 0, workOrdersWithIncompleteCost: 0 },
        { month: '2026-07', corrective: 0, preventive: 0, total: 0, workOrdersWithIncompleteCost: 0 },
      ]);
    });

    it('deve lançar peças e mão de obra no mês de conclusão, a valores congelados', async () => {
      // Arrange — 2 × 100 + 3h × 45 = 335, concluída em junho
      repo.findCompleted.mockResolvedValue([
        makeCompleted({ completedAt: new Date('2026-06-15T12:00:00Z') }),
      ]);

      // Act
      const result = await service.getMonthlyCosts(MAY_TO_JULY);

      // Assert
      expect(result[0].total).toBe(0);
      expect(result[1].corrective).toBe(335);
    });

    it('deve lançar serviço externo no mês de competência, não no de conclusão', async () => {
      // Arrange — OS concluída em maio, serviço com competência em julho
      repo.findCompleted.mockResolvedValue([
        makeCompleted({ laborHours: 0, parts: [], completedAt: new Date('2026-05-10T12:00:00Z') }),
      ]);
      repo.findExternalCosts.mockResolvedValue([
        makeExternal({ amount: 380, incurredAt: new Date('2026-07-05T12:00:00Z') }),
      ]);

      // Act
      const result = await service.getMonthlyCosts(MAY_TO_JULY);

      // Assert
      expect(result[0].total).toBe(0);
      expect(result[2].corrective).toBe(380);
    });

    it('deve separar corretiva de preventiva', async () => {
      // Arrange
      repo.findCompleted.mockResolvedValue([
        makeCompleted({ id: 1, type: WorkOrderType.CORRECTIVE }),
        makeCompleted({ id: 2, type: WorkOrderType.PREVENTIVE }),
      ]);
      repo.findExternalCosts.mockResolvedValue([
        makeExternal({
          amount: 100,
          workOrder: { assetId: injetora.id, asset: injetora, type: WorkOrderType.PREVENTIVE },
        }),
      ]);

      // Act
      const [may] = await service.getMonthlyCosts(MAY_TO_JULY);

      // Assert
      expect(may.corrective).toBe(335);
      expect(may.preventive).toBe(435);
      expect(may.total).toBe(770);
    });

    it('deve contar no mês as OS com custo incompleto', async () => {
      // Arrange
      repo.findCompleted.mockResolvedValue([
        makeCompleted({ id: 1, costIsComplete: false }),
        makeCompleted({ id: 2, costIsComplete: true }),
      ]);

      // Act
      const [may] = await service.getMonthlyCosts(MAY_TO_JULY);

      // Assert
      expect(may.workOrdersWithIncompleteCost).toBe(1);
    });

    it('deve repassar ativo e período resolvido ao repositório', async () => {
      // Act
      await service.getMonthlyCosts({ ...MAY_TO_JULY, assetId: 3 });

      // Assert
      expect(repo.findCompleted).toHaveBeenCalledWith(3, MAY_TO_JULY.from, MAY_TO_JULY.to);
      expect(repo.findExternalCosts).toHaveBeenCalledWith(3, MAY_TO_JULY.from, MAY_TO_JULY.to);
    });
  });
});
