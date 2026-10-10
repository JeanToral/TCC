import { BadRequestException } from '@nestjs/common';
import { PassThrough } from 'node:stream';
import { finished } from 'node:stream/promises';
import ExcelJS from 'exceljs';

import type { ColumnDefinition, ExportMetadata } from './column-definition';
import { EXPORT_ROW_LIMIT } from './column-definition';
import {
  buildCsvHeader,
  buildCsvRow,
  CSV_BOM,
  formatCsvCell,
  writeCsv,
} from './csv-writer';
import { toSaoPauloWallClock, writeXlsx } from './xlsx-writer';
import {
  assetCostColumns,
  buildFilename,
  coverageNote,
  describePeriod,
  ExportService,
  sparePartColumns,
  sumAssetCosts,
  sumStockValue,
  toSparePartExportRow,
  workOrderColumns,
} from './export.service';
import type {
  FinanceService,
  AssetCostRecord,
} from '../finance/finance.service';
import type { SparePartRecord } from '../spare-parts/spare-parts.repository';
import type { SparePartsService } from '../spare-parts/spare-parts.service';
import type { WorkOrdersService } from '../work-orders/work-orders.service';

// ─────────────────────── Fixtures ────────────────────────
interface Row {
  readonly name: string;
  readonly qty: number;
  readonly price: number;
  readonly day: Date;
}

const COLUMNS: readonly ColumnDefinition<Row>[] = [
  { key: 'name', label: 'Nome', type: 'text', value: (r) => r.name },
  { key: 'qty', label: 'Qtd', type: 'integer', value: (r) => r.qty },
  { key: 'price', label: 'Preço', type: 'currency', value: (r) => r.price },
  { key: 'day', label: 'Competência', type: 'date', value: (r) => r.day },
];

const ROWS: Row[] = [
  {
    name: 'Rolamento 6205',
    qty: 2,
    price: 1234.5,
    day: new Date('2025-03-05T00:00:00Z'),
  },
  {
    name: 'Retentor; 40x62',
    qty: 1,
    price: 89.9,
    day: new Date('2025-05-12T00:00:00Z'),
  },
];

const META: ExportMetadata = {
  title: 'Teste',
  generatedAt: new Date('2026-10-10T15:00:00Z'),
  generatedBy: 'manager@cmms.com',
  filters: [{ label: 'Status', value: 'Concluída' }],
  notes: ['Aviso de teste'],
};

async function* iterate<T>(rows: readonly T[]): AsyncGenerator<T> {
  // Simula o repositório, que entrega lotes de forma assíncrona.
  for (const r of rows) yield await Promise.resolve(r);
}

/**
 * Escreve num stream em memória e devolve os bytes. O ExcelJS encerra o stream
 * sozinho no commit; o CSV não — por isso o `end()` é condicional.
 */
async function capture(
  write: (out: PassThrough) => Promise<number>,
): Promise<Buffer> {
  const out = new PassThrough();
  const chunks: Buffer[] = [];
  out.on('data', (c: Buffer) => chunks.push(c));
  const done = finished(out);
  await write(out);
  if (!out.writableEnded) out.end();
  await done;
  return Buffer.concat(chunks);
}

// ─────────────────────── CSV ─────────────────────────────
describe('CSV pt-BR', () => {
  it('deve usar ; como separador', () => {
    // Act
    const header = buildCsvHeader(COLUMNS);

    // Assert
    expect(header).toBe('Nome;Qtd;Preço;Competência');
  });

  it('deve incluir BOM UTF-8 no início do arquivo', async () => {
    // Act
    const bytes = await capture((out) => writeCsv(out, COLUMNS, iterate(ROWS)));

    // Assert
    expect(bytes.toString('utf8').startsWith(CSV_BOM)).toBe(true);
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  });

  it('deve formatar decimal com vírgula e sem separador de milhar', () => {
    // Act & Assert
    expect(formatCsvCell(1234.5, 'currency')).toBe('1234,50');
    expect(formatCsvCell(0.1 + 0.2, 'number')).toBe('0,30');
  });

  it('deve formatar inteiro sem casas decimais', () => {
    expect(formatCsvCell(7, 'integer')).toBe('7');
  });

  it('deve formatar data como dd/mm/aaaa sem deslocar pelo fuso', () => {
    // Arrange — competência gravada como meia-noite UTC
    const day = new Date('2025-03-05T00:00:00Z');

    // Act & Assert — no fuso de Brasília seria 04/03; tem de continuar 05/03
    expect(formatCsvCell(day, 'date')).toBe('05/03/2025');
  });

  it('deve formatar data-hora no horário de Brasília', () => {
    // 12:00 UTC = 09:00 em Brasília
    expect(formatCsvCell(new Date('2025-01-10T12:00:00Z'), 'datetime')).toBe(
      '10/01/2025 09:00',
    );
  });

  it('deve deixar célula vazia para valor nulo', () => {
    expect(formatCsvCell(null, 'currency')).toBe('');
    expect(formatCsvCell(null, 'text')).toBe('');
  });

  it('deve envolver em aspas campo que contém ponto e vírgula', () => {
    // Act
    const line = buildCsvRow(COLUMNS, ROWS[1]);

    // Assert
    expect(line.startsWith('"Retentor; 40x62";')).toBe(true);
  });

  it('deve escapar aspas duplicando-as', () => {
    expect(formatCsvCell('Peça "premium"', 'text')).toBe('"Peça ""premium"""');
  });

  it('deve envolver em aspas campo com quebra de linha', () => {
    expect(formatCsvCell('linha 1\nlinha 2', 'text')).toBe(
      '"linha 1\nlinha 2"',
    );
  });

  it('deve neutralizar injeção de fórmula em texto', () => {
    // Arrange — descrição digitada por usuário
    const malicious = '=HYPERLINK("http://x","clique")';

    // Act
    const cell = formatCsvCell(malicious, 'text');

    // Assert — prefixo de apóstrofo impede a execução no Excel
    expect(cell.startsWith('"\'=')).toBe(true);
  });

  it('não deve neutralizar número negativo', () => {
    expect(formatCsvCell(-15.5, 'number')).toBe('-15,50');
  });

  it('deve escrever a linha de totais por último, fora da contagem', async () => {
    // Arrange
    const footer: Row = {
      name: 'TOTAL',
      qty: 3,
      price: 1324.4,
      day: ROWS[0].day,
    };
    let count = 0;

    // Act
    const text = (
      await capture(async (out) => {
        count = await writeCsv(out, COLUMNS, iterate(ROWS), footer);
        return count;
      })
    ).toString('utf8');

    // Assert
    const lines = text.trimEnd().split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe('TOTAL;3;1324,40;05/03/2025');
    expect(count).toBe(2);
  });

  it('deve separar linhas com CRLF e contar as linhas escritas', async () => {
    // Act
    let count = 0;
    const bytes = await capture(async (out) => {
      count = await writeCsv(out, COLUMNS, iterate(ROWS));
      return count;
    });
    const text = bytes.toString('utf8').replace(CSV_BOM, '');

    // Assert — cabeçalho + 2 linhas, cada uma terminando em \r\n
    expect(count).toBe(2);
    expect(text.split('\r\n')).toHaveLength(4);
    expect(text.endsWith('\r\n')).toBe(true);
  });
});

// ─────────────────────── XLSX ────────────────────────────
describe('XLSX', () => {
  async function load(): Promise<ExcelJS.Workbook> {
    const bytes = await capture((out) =>
      writeXlsx(out, COLUMNS, iterate(ROWS), META),
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes);
    return wb;
  }

  it('deve gerar célula numérica, não texto', async () => {
    // Act
    const sheet = (await load()).getWorksheet('Dados')!;

    // Assert
    expect(typeof sheet.getCell('C2').value).toBe('number');
    expect(sheet.getCell('C2').value).toBe(1234.5);
    expect(typeof sheet.getCell('B2').value).toBe('number');
  });

  it('deve aplicar formato de moeda em coluna currency', async () => {
    // Act
    const sheet = (await load()).getWorksheet('Dados')!;

    // Assert
    expect(sheet.getCell('C2').numFmt).toBe('"R$" #,##0.00');
  });

  it('deve gerar célula de data real com formato dd/mm/yyyy', async () => {
    // Act
    const sheet = (await load()).getWorksheet('Dados')!;

    // Assert
    expect(sheet.getCell('D2').value).toBeInstanceOf(Date);
    expect(sheet.getCell('D2').numFmt).toBe('dd/mm/yyyy');
  });

  it('deve congelar o cabeçalho e aplicar autofiltro', async () => {
    // Act
    const sheet = (await load()).getWorksheet('Dados')!;

    // Assert
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(sheet.autoFilter).toBeDefined();
    expect(sheet.getCell('A1').value).toBe('Nome');
    expect(sheet.getCell('A1').font?.bold).toBe(true);
  });

  it('deve incluir a aba Sobre com metadados e total de linhas', async () => {
    // Act
    const about = (await load()).getWorksheet('Sobre')!;
    const values = about.getColumn(2).values;

    // Assert
    expect(values).toContain('Teste');
    expect(values).toContain('manager@cmms.com');
    expect(values).toContain(2);
    expect(values).toContain('Concluída');
    expect(values).toContain('Aviso de teste');
  });

  it('deve deixar a linha de totais em negrito e fora do autofiltro', async () => {
    // Arrange
    const footer: Row = {
      name: 'TOTAL',
      qty: 3,
      price: 1324.4,
      day: ROWS[0].day,
    };
    const bytes = await capture((out) =>
      writeXlsx(out, COLUMNS, iterate(ROWS), META, footer),
    );
    const wb = new ExcelJS.Workbook();

    // Act
    await wb.xlsx.load(bytes);
    const sheet = wb.getWorksheet('Dados')!;
    const about = wb.getWorksheet('Sobre')!;

    // Assert
    expect(sheet.getCell('A4').value).toBe('TOTAL');
    expect(sheet.getCell('A4').font?.bold).toBe(true);
    expect(sheet.getCell('C4').numFmt).toBe('"R$" #,##0.00');
    expect(sheet.autoFilter).toBe('A1:D3');
    // "Total de linhas" conta só os dados
    expect(about.getColumn(2).values).toContain(2);
    expect(about.getColumn(2).values).not.toContain(3);
  });

  it('deve deslocar data-hora para o relógio de Brasília', () => {
    // 12:00 UTC → 09:00 em Brasília, representado nos componentes UTC
    const shifted = toSaoPauloWallClock(new Date('2025-01-10T12:00:00Z'));
    expect(shifted.toISOString()).toBe('2025-01-10T09:00:00.000Z');
  });
});

// ─────────────────────── Serviço ─────────────────────────
describe('ExportService', () => {
  const service = new ExportService(
    {} as WorkOrdersService,
    {} as FinanceService,
    {} as SparePartsService,
  );

  it('deve rejeitar exportação acima do teto com mensagem clara', () => {
    // Act & Assert
    expect(() => service.assertWithinLimit(EXPORT_ROW_LIMIT + 1)).toThrow(
      BadRequestException,
    );
    expect(() => service.assertWithinLimit(EXPORT_ROW_LIMIT + 1)).toThrow(
      /Refine o período/,
    );
  });

  it('deve aceitar exportação exatamente no teto', () => {
    expect(() => service.assertWithinLimit(EXPORT_ROW_LIMIT)).not.toThrow();
  });

  it('deve omitir as colunas de custo sem cost.read', () => {
    // Act
    const keys = workOrderColumns(false).map((c) => c.key);

    // Assert
    expect(keys).not.toContain('totalCost');
    expect(keys).not.toContain('partsCost');
    expect(keys).not.toContain('coverage');
  });

  it('deve incluir as colunas de custo com cost.read', () => {
    // Act
    const keys = workOrderColumns(true).map((c) => c.key);

    // Assert
    expect(keys).toEqual(
      expect.arrayContaining([
        'partsCost',
        'laborCost',
        'externalCost',
        'totalCost',
        'coverage',
      ]),
    );
  });

  it('deve separar tempo de parada de horas apontadas', () => {
    // Arrange — 65h de parada, 3h trabalhadas
    const col = workOrderColumns(false).find((c) => c.key === 'downtime')!;
    const row = {
      startedAt: new Date('2025-01-10T16:00:00Z'),
      completedAt: new Date('2025-01-13T09:00:00Z'),
      laborHours: 3,
    };

    // Act & Assert
    expect(col.value(row as never)).toBe(65);
  });

  it('deve nomear o arquivo com o período filtrado', () => {
    expect(
      buildFilename(
        'ordens-de-servico',
        'xlsx',
        new Date('2026-10-10T12:00:00Z'),
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-12-31T00:00:00Z'),
      ),
    ).toBe('ordens-de-servico_2025-01-01_2025-12-31.xlsx');
  });

  it('deve nomear o arquivo pela data de geração quando não há período', () => {
    expect(
      buildFilename(
        'ordens-de-servico',
        'csv',
        new Date('2026-10-10T12:00:00Z'),
      ),
    ).toBe('ordens-de-servico_2026-10-10.csv');
  });
});

// ─────────────────────── Custos por ativo ────────────────
const makeCost = (
  overrides: Partial<AssetCostRecord> = {},
): AssetCostRecord => ({
  assetId: 1,
  assetName: 'Torno CNC',
  assetTag: 'TRN-001',
  realizedPartsCost: 271,
  realizedLaborCost: 157.5,
  realizedExternalCost: 0,
  realizedTotal: 428.5,
  realizedCorrectiveCost: 428.5,
  realizedPreventiveCost: 0,
  forecastTotal: 90,
  completedWorkOrders: 1,
  workOrdersWithIncompleteCost: 0,
  ...overrides,
});

describe('Relatório de custos por ativo', () => {
  it('deve somar todas as colunas na linha de totais', () => {
    // Arrange
    const records = [
      makeCost(),
      makeCost({
        assetId: 2,
        assetTag: 'INJ-003',
        realizedPartsCost: 200,
        realizedLaborCost: 135,
        realizedExternalCost: 380,
        realizedTotal: 715,
        realizedCorrectiveCost: 335,
        realizedPreventiveCost: 380,
        completedWorkOrders: 4,
        workOrdersWithIncompleteCost: 1,
      }),
    ];

    // Act
    const totals = sumAssetCosts(records);

    // Assert
    expect(totals).toMatchObject({
      assetTag: 'TOTAL',
      realizedPartsCost: 471,
      realizedLaborCost: 292.5,
      realizedExternalCost: 380,
      realizedTotal: 1143.5,
      realizedCorrectiveCost: 763.5,
      realizedPreventiveCost: 380,
      completedWorkOrders: 5,
      workOrdersWithIncompleteCost: 1,
    });
  });

  it('deve repetir o período em todas as linhas', () => {
    // Arrange
    const col = assetCostColumns('01/01/2025 a 31/12/2025').find(
      (c) => c.key === 'period',
    )!;

    // Act & Assert
    expect(col.value(makeCost())).toBe('01/01/2025 a 31/12/2025');
  });

  it('não deve somar o previsto ao custo total', () => {
    // Arrange
    const col = assetCostColumns('x').find((c) => c.key === 'total')!;

    // Act & Assert
    expect(col.value(makeCost({ forecastTotal: 999 }))).toBe(428.5);
  });

  it('deve descrever o período no horário de Brasília', () => {
    // Meia-noite local de Brasília = 03:00 UTC
    expect(
      describePeriod(
        new Date('2025-01-01T03:00:00Z'),
        new Date('2025-12-31T03:00:00Z'),
      ),
    ).toBe('01/01/2025 a 31/12/2025');
    expect(describePeriod()).toBe('Todo o histórico');
  });

  it('deve declarar cobertura incompleta com a contagem de OS', () => {
    // Act
    const note = coverageNote(
      makeCost({ completedWorkOrders: 5, workOrdersWithIncompleteCost: 2 }),
    );

    // Assert
    expect(note).toMatch(/^Cobertura incompleta: 2 de 5 OS/);
  });

  it('deve declarar cobertura completa quando nenhuma OS falta', () => {
    expect(coverageNote(makeCost({ completedWorkOrders: 5 }))).toMatch(
      /^Cobertura completa/,
    );
  });
});

// ─────────────────────── Estoque de peças ────────────────
const makePart = (
  overrides: Partial<SparePartRecord> = {},
): SparePartRecord => ({
  id: 1,
  name: 'Rolamento 6205',
  partNumber: 'ROL-6205',
  description: null,
  quantity: 10,
  minimumStock: 4,
  unitCost: 135.5,
  deletedAt: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

describe('Relatório de estoque', () => {
  it('deve calcular valor em estoque como quantity × unitCost', () => {
    expect(toSparePartExportRow(makePart()).stockValue).toBe(1355);
  });

  it('deve deixar o valor vazio, não zero, para peça sem custo unitário', () => {
    expect(
      toSparePartExportRow(makePart({ unitCost: null })).stockValue,
    ).toBeNull();
  });

  it('deve marcar estoque baixo só quando quantity < minimumStock', () => {
    // Arrange & Act
    const below = toSparePartExportRow(makePart({ quantity: 3 }));
    const equal = toSparePartExportRow(makePart({ quantity: 4 }));

    // Assert — mesma regra da notificação LOW_STOCK
    expect(below.situation).toBe('Estoque baixo');
    expect(equal.situation).toBe('Normal');
  });

  it('deve omitir custo unitário e valor sem cost.read', () => {
    // Act
    const keys = sparePartColumns(false).map((c) => c.key);

    // Assert
    expect(keys).not.toContain('unitCost');
    expect(keys).not.toContain('stockValue');
    expect(keys.at(-1)).toBe('situation');
  });

  it('deve incluir custo unitário e valor com cost.read', () => {
    expect(sparePartColumns(true).map((c) => c.key)).toEqual([
      'partNumber',
      'name',
      'description',
      'quantity',
      'minimumStock',
      'unitCost',
      'stockValue',
      'situation',
    ]);
  });

  it('deve totalizar só o valor em estoque, ignorando peças sem custo', () => {
    // Arrange
    const rows = [
      makePart(),
      makePart({ id: 2, quantity: 3, unitCost: 20 }),
      makePart({ id: 3, unitCost: null }),
    ].map(toSparePartExportRow);

    // Act
    const totals = sumStockValue(rows);

    // Assert
    expect(totals.partNumber).toBe('TOTAL');
    expect(totals.stockValue).toBe(1415);
    expect(totals.quantity).toBeNull();
  });
});
