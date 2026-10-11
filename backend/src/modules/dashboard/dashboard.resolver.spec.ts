import { Test, type TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { WorkOrderStatus } from '../../generated/prisma';

import { PERMISSION_KEY } from '../../common/decorators/requires-permission.decorator';

import { DashboardResolver } from './dashboard.resolver';
import { DashboardService, type AssetKpiRecord } from './dashboard.service';
import type { DashboardFilterInput } from './dto/dashboard-filter.input';

const makeKpi = (overrides: Partial<AssetKpiRecord> = {}): AssetKpiRecord => ({
  assetId: 1,
  assetName: 'Torno CNC #1',
  mttr: 4.0,
  mtbf: 720.0,
  totalWorkOrders: 5,
  completedWorkOrders: 4,
  ...overrides,
});

describe('DashboardResolver', () => {
  let resolver: DashboardResolver;
  let service: jest.Mocked<DashboardService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardResolver,
        {
          provide: DashboardService,
          useValue: {
            getKpis: jest.fn(),
            getStatusCounts: jest.fn(),
            getMonthlyTrend: jest.fn(),
          } satisfies Partial<jest.Mocked<DashboardService>>,
        },
      ],
    }).compile();

    resolver = module.get(DashboardResolver);
    service = module.get(DashboardService);
  });

  it('deve delegar dashboardKpis() ao DashboardService.getKpis sem filtro', async () => {
    // Arrange
    const kpis = [makeKpi(), makeKpi({ assetId: 2, assetName: 'Fresadora #2' })];
    service.getKpis.mockResolvedValue(kpis);

    // Act
    const result = await resolver.dashboardKpis(undefined);

    // Assert
    expect(service.getKpis).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(kpis);
  });

  it('deve passar o filtro ao DashboardService.getKpis quando fornecido', async () => {
    // Arrange
    const filter: DashboardFilterInput = {
      assetId: 1,
      from: new Date('2025-01-01T00:00:00Z'),
      to: new Date('2025-06-30T23:59:59Z'),
    };
    const kpis = [makeKpi()];
    service.getKpis.mockResolvedValue(kpis);

    // Act
    const result = await resolver.dashboardKpis(filter);

    // Assert
    expect(service.getKpis).toHaveBeenCalledWith(filter);
    expect(result).toEqual(kpis);
  });

  it('deve retornar lista vazia quando não há KPIs para o filtro', async () => {
    // Arrange
    const filter: DashboardFilterInput = {
      assetId: 99,
    };
    service.getKpis.mockResolvedValue([]);

    // Act
    const result = await resolver.dashboardKpis(filter);

    // Assert
    expect(service.getKpis).toHaveBeenCalledWith(filter);
    expect(result).toHaveLength(0);
  });

  it('deve propagar erro lançado pelo DashboardService', async () => {
    // Arrange
    service.getKpis.mockRejectedValue(new Error('Database error'));

    // Act & Assert
    await expect(resolver.dashboardKpis(undefined)).rejects.toThrow('Database error');
  });

  it('deve retornar KPIs com mttr e mtbf nulos quando não há dados suficientes', async () => {
    // Arrange
    const kpiSemDados = makeKpi({ mttr: null, mtbf: null, completedWorkOrders: 1 });
    service.getKpis.mockResolvedValue([kpiSemDados]);

    // Act
    const result = await resolver.dashboardKpis(undefined);

    // Assert
    expect(result[0].mttr).toBeNull();
    expect(result[0].mtbf).toBeNull();
    expect(result[0].completedWorkOrders).toBe(1);
  });

  it('deve delegar dashboardStatusCounts ao DashboardService.getStatusCounts', async () => {
    // Arrange
    const counts = [{ status: WorkOrderStatus.REQUESTED, count: 3 }];
    service.getStatusCounts.mockResolvedValue(counts);
    const filter: DashboardFilterInput = { assetId: 1 };

    // Act
    const result = await resolver.dashboardStatusCounts(filter);

    // Assert
    expect(service.getStatusCounts).toHaveBeenCalledWith(filter);
    expect(result).toBe(counts);
  });

  it('deve delegar dashboardMonthlyTrend ao DashboardService.getMonthlyTrend', async () => {
    // Arrange
    service.getMonthlyTrend.mockResolvedValue([]);

    // Act
    await resolver.dashboardMonthlyTrend(undefined);

    // Assert
    expect(service.getMonthlyTrend).toHaveBeenCalledWith(undefined);
  });

  it('deve exigir dashboard.read nas queries de série', () => {
    // Arrange
    const reflector = new Reflector();
    const proto = Object.getPrototypeOf(resolver) as DashboardResolver;

    // Act / Assert
    for (const handler of [proto.dashboardStatusCounts, proto.dashboardMonthlyTrend]) {
      expect(reflector.get<string>(PERMISSION_KEY, handler)).toBe('dashboard.read');
    }
  });
});
