import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';
import type { CorrectiveWorkOrderRecord } from './dashboard.repository';

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
});
