import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AssetsService } from './assets.service';
import { AssetsRepository } from './assets.repository';
import type { AssetRecord } from './assets.repository';

// ─────────────────────── Fixtures ────────────────────────
const makeAsset = (overrides: Partial<AssetRecord> = {}): AssetRecord => ({
  id: 1,
  name: 'Torno CNC 01',
  tag: 'MQ-001',
  location: 'Usinagem',
  manufacturer: 'Romi',
  model: 'D600',
  serialNumber: 'SN-2024-001',
  installDate: new Date('2024-01-15'),
  deletedAt: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

// ─────────────────────── Suite ───────────────────────────
describe('AssetsService', () => {
  let service: AssetsService;
  let repo: jest.Mocked<AssetsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: AssetsRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          } satisfies Partial<jest.Mocked<AssetsRepository>>,
        },
      ],
    }).compile();

    service = module.get(AssetsService);
    repo = module.get(AssetsRepository);
  });

  // ── findAll ──────────────────────────────────────────────

  describe('findAll', () => {
    it('deve retornar todos os ativos não deletados', async () => {
      // Arrange
      const assets = [makeAsset(), makeAsset({ id: 2, tag: 'MQ-002' })];
      repo.findAll.mockResolvedValue(assets);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ── findById ─────────────────────────────────────────────

  describe('findById', () => {
    it('deve retornar o ativo quando encontrado', async () => {
      // Arrange
      const asset = makeAsset();
      repo.findById.mockResolvedValue(asset);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result).toEqual(asset);
      expect(repo.findById).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException para ativo inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────

  describe('create', () => {
    it('deve criar e retornar o ativo', async () => {
      // Arrange
      const asset = makeAsset();
      repo.create.mockResolvedValue(asset);

      // Act
      const result = await service.create({
        name: 'Torno CNC 01',
        tag: 'MQ-001',
        location: 'Usinagem',
      });

      // Assert
      expect(result).toEqual(asset);
      expect(repo.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── update ───────────────────────────────────────────────

  describe('update', () => {
    it('deve lançar NotFoundException ao atualizar ativo inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, { name: 'Novo Nome' })).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('deve atualizar e retornar o ativo existente', async () => {
      // Arrange
      const updated = makeAsset({ name: 'Torno CNC 02' });
      repo.findById.mockResolvedValue(makeAsset());
      repo.update.mockResolvedValue(updated);

      // Act
      const result = await service.update(1, { name: 'Torno CNC 02' });

      // Assert
      expect(result.name).toBe('Torno CNC 02');
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Torno CNC 02' }));
    });
  });

  // ── softDelete ───────────────────────────────────────────

  describe('softDelete', () => {
    it('deve lançar NotFoundException ao deletar ativo inexistente', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.softDelete(999)).rejects.toThrow(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException ao tentar deletar ativo já removido', async () => {
      // Arrange
      repo.findById.mockResolvedValue(makeAsset({ deletedAt: new Date() }));

      // Act & Assert
      await expect(service.softDelete(1)).rejects.toThrow(BadRequestException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });

    it('deve aplicar soft delete em ativo existente', async () => {
      // Arrange
      const deleted = makeAsset({ deletedAt: new Date() });
      repo.findById.mockResolvedValue(makeAsset());
      repo.softDelete.mockResolvedValue(deleted);

      // Act
      const result = await service.softDelete(1);

      // Assert
      expect(result.deletedAt).not.toBeNull();
      expect(repo.softDelete).toHaveBeenCalledWith(1);
    });
  });
});
