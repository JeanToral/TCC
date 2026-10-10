// ─────────────────────── Imports ────────────────────────
import type { Writable } from 'node:stream';
import ExcelJS from 'exceljs';

import {
  type CellValue,
  type ColumnDefinition,
  type ColumnType,
  DEFAULT_WIDTH,
  type ExportMetadata,
  SAO_PAULO_TZ,
} from './column-definition';

// ─────────────────────── Constants ──────────────────────
/**
 * Códigos de formato do Excel usam símbolos invariantes; o Excel em português
 * os exibe localizados (`#,##0.00` aparece como `1.234,56`).
 */
const NUM_FMT: Record<ColumnType, string | undefined> = {
  text: undefined,
  integer: '0',
  number: '#,##0.00',
  currency: '"R$" #,##0.00',
  date: 'dd/mm/yyyy',
  datetime: 'dd/mm/yyyy hh:mm',
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF3F4F6' },
};

const SP_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: SAO_PAULO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

// ─────────────────────── Helpers ────────────────────────
/**
 * Excel não tem fuso: grava a data com os componentes UTC do Date. Para que um
 * instante apareça no horário de Brasília, desloca-se o Date de modo que seus
 * componentes UTC sejam o relógio de parede de São Paulo.
 */
export function toSaoPauloWallClock(date: Date): Date {
  const parts = Object.fromEntries(
    SP_PARTS.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ),
  );
}

/** Converte o valor para o tipo de célula nativo do Excel. */
export function toXlsxValue(
  value: CellValue,
  type: ColumnType,
): ExcelJS.CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return type === 'datetime' ? toSaoPauloWallClock(value) : value;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  // Strings viram células de texto, nunca fórmulas: no XLSX não há injeção.
  return value;
}

// ─────────────────────── Writer ─────────────────────────
/**
 * Escreve o XLSX em streaming (memória constante): aba "Dados" com cabeçalho
 * congelado, autofiltro e tipos de célula reais; aba "Sobre" com os metadados.
 *
 * `footer` é a linha de totais: em negrito, por último e fora da contagem.
 */
export async function writeXlsx<T>(
  out: Writable,
  columns: readonly ColumnDefinition<T>[],
  rows: AsyncIterable<T> | Iterable<T>,
  meta: ExportMetadata,
  footer?: T,
): Promise<number> {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: out,
    useStyles: true,
    useSharedStrings: false,
  });
  workbook.creator = 'CMMS';
  workbook.created = meta.generatedAt;

  // ── Aba de dados ──────────────────────────────────────────
  const sheet = workbook.addWorksheet('Dados', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: c.width ?? DEFAULT_WIDTH[c.type],
  }));

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = HEADER_FILL;
  header.commit();

  const addRow = (row: T): ExcelJS.Row => {
    const excelRow = sheet.addRow(
      columns.map((c) => toXlsxValue(c.value(row), c.type)),
    );
    columns.forEach((c, i) => {
      const fmt = NUM_FMT[c.type];
      if (fmt) excelRow.getCell(i + 1).numFmt = fmt;
    });
    return excelRow;
  };

  let count = 0;
  for await (const row of rows) {
    addRow(row).commit();
    count++;
  }
  // Gravado no commit: dá para limitar o filtro às linhas de dados, deixando
  // a linha de totais fora de ordenação e filtro.
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: count + 1, column: columns.length },
  };

  if (footer !== undefined) {
    const totals = addRow(footer);
    totals.font = { bold: true };
    totals.commit();
  }

  sheet.commit();

  // ── Aba de metadados ─────────────────────────────────────
  const about = workbook.addWorksheet('Sobre');
  about.columns = [
    { header: 'Campo', key: 'field', width: 24 },
    { header: 'Valor', key: 'value', width: 70 },
  ];
  about.getRow(1).font = { bold: true };
  about.getRow(1).commit();

  const aboutRows: [string, ExcelJS.CellValue][] = [
    ['Relatório', meta.title],
    ['Gerado em', toSaoPauloWallClock(meta.generatedAt)],
    ['Gerado por', meta.generatedBy],
    ['Total de linhas', count],
    ...meta.filters.map((f): [string, ExcelJS.CellValue] => [
      `Filtro: ${f.label}`,
      f.value,
    ]),
    ...(meta.notes ?? []).map((n): [string, ExcelJS.CellValue] => ['Aviso', n]),
  ];

  for (const [field, value] of aboutRows) {
    const r = about.addRow([field, value]);
    if (value instanceof Date) r.getCell(2).numFmt = NUM_FMT.datetime ?? '';
    r.commit();
  }
  about.commit();

  await workbook.commit();
  return count;
}
