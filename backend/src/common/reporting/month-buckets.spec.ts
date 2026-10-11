import { BadRequestException } from '@nestjs/common';

import { monthKey, monthKeysBetween, resolvePeriod } from './month-buckets';

describe('month-buckets', () => {
  describe('monthKey', () => {
    it('deve agrupar no fuso de São Paulo, não em UTC', () => {
      // Arrange — 31/05 às 23h em SP é 01/06 02h em UTC
      const lateMay = new Date('2026-06-01T02:00:00Z');

      // Act
      const key = monthKey(lateMay);

      // Assert
      expect(key).toBe('2026-05');
    });

    it('deve virar o mês à meia-noite de São Paulo', () => {
      expect(monthKey(new Date('2026-06-01T03:00:00Z'))).toBe('2026-06');
    });
  });

  describe('monthKeysBetween', () => {
    it('deve listar todos os meses, inclusive os vazios, atravessando o ano', () => {
      // Act
      const keys = monthKeysBetween(
        new Date('2025-11-15T12:00:00Z'),
        new Date('2026-02-03T12:00:00Z'),
      );

      // Assert
      expect(keys).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    });

    it('deve devolver um único mês quando início e fim caem no mesmo mês', () => {
      expect(
        monthKeysBetween(new Date('2026-03-01T12:00:00Z'), new Date('2026-03-30T12:00:00Z')),
      ).toEqual(['2026-03']);
    });
  });

  describe('resolvePeriod', () => {
    it('deve usar os últimos 6 meses, a partir do dia 1º, quando nada é informado', () => {
      // Arrange
      const now = new Date('2026-10-11T15:00:00Z');

      // Act
      const period = resolvePeriod(undefined, undefined, now);

      // Assert
      expect(period.to).toBe(now);
      expect(period.from.toISOString()).toBe('2026-05-01T03:00:00.000Z');
      expect(monthKeysBetween(period.from, period.to)).toHaveLength(6);
    });

    it('deve respeitar o período informado', () => {
      // Arrange
      const from = new Date('2026-01-01T03:00:00Z');
      const to = new Date('2026-03-31T23:00:00Z');

      // Act
      const period = resolvePeriod(from, to);

      // Assert
      expect(period).toEqual({ from, to });
    });

    it('deve rejeitar período invertido', () => {
      expect(() =>
        resolvePeriod(new Date('2026-05-01'), new Date('2026-01-01')),
      ).toThrow(BadRequestException);
    });

    it('deve rejeitar período maior que 36 meses', () => {
      expect(() =>
        resolvePeriod(new Date('2020-01-01T12:00:00Z'), new Date('2026-01-01T12:00:00Z')),
      ).toThrow('no máximo 36 meses');
    });
  });
});
