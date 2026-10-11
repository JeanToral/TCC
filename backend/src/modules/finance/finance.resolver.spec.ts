import { Test, type TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';

import { PermissionGuard } from '../auth/guards/permission.guard';
import { FinanceResolver } from './finance.resolver';
import { FinanceService } from './finance.service';
import type { AssetCostRecord } from './finance.service';

const makeRecord = (): AssetCostRecord => ({
  assetId: 3,
  assetName: 'Injetora 03',
  assetTag: 'INJ-003',
  realizedPartsCost: 200,
  realizedLaborCost: 135,
  realizedExternalCost: 380,
  realizedTotal: 715,
  realizedCorrectiveCost: 715,
  realizedPreventiveCost: 0,
  forecastTotal: 0,
  completedWorkOrders: 1,
  workOrdersWithIncompleteCost: 0,
});

describe('FinanceResolver', () => {
  let resolver: FinanceResolver;
  let service: jest.Mocked<FinanceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceResolver,
        {
          provide: FinanceService,
          useValue: {
            getAssetCosts: jest.fn(),
            getMonthlyCosts: jest.fn(),
          } satisfies Partial<jest.Mocked<FinanceService>>,
        },
      ],
    }).compile();

    resolver = module.get(FinanceResolver);
    service = module.get(FinanceService);
  });

  it('deve delegar assetCosts ao FinanceService', async () => {
    // Arrange
    const records = [makeRecord()];
    service.getAssetCosts.mockResolvedValue(records);
    const filter = { assetId: 3 };

    // Act
    const result = await resolver.assetCosts(filter);

    // Assert
    expect(result).toBe(records);
    expect(service.getAssetCosts).toHaveBeenCalledWith(filter);
  });

  it('deve exigir a permissão cost.read na query assetCosts', () => {
    // Arrange — a permissão é declarada por metadata e lida pelo PermissionGuard
    const reflector = new Reflector();

    // Act
    const required = reflector.get<string>(
      'required_permission',
      Object.getPrototypeOf(resolver).assetCosts,
    );

    // Assert
    expect(required).toBe('cost.read');
    expect(PermissionGuard).toBeDefined();
  });

  it('deve delegar monthlyCosts ao FinanceService', async () => {
    // Arrange
    service.getMonthlyCosts.mockResolvedValue([]);
    const filter = { assetId: 3 };

    // Act
    await resolver.monthlyCosts(filter);

    // Assert
    expect(service.getMonthlyCosts).toHaveBeenCalledWith(filter);
  });

  it('deve exigir a permissão cost.read na query monthlyCosts', () => {
    // Arrange
    const reflector = new Reflector();

    // Act
    const required = reflector.get<string>(
      'required_permission',
      Object.getPrototypeOf(resolver).monthlyCosts,
    );

    // Assert
    expect(required).toBe('cost.read');
  });
});
