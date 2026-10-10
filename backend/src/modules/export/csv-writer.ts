// ─────────────────────── Imports ────────────────────────
import type { Writable } from 'node:stream';

import {
  type CellValue,
  type ColumnDefinition,
  type ColumnType,
  SAO_PAULO_TZ,
} from './column-definition';

// ─────────────────────── Constants ──────────────────────
/**
 * Convenções do Excel em português. Sem elas o arquivo "abre quebrado":
 * tudo na coluna A, acentos corrompidos e números lidos como texto.
 */
export const CSV_SEPARATOR = ';';
export const CSV_BOM = '﻿';
export const CSV_EOL = '\r\n';

/** Caracteres que fazem o Excel interpretar a célula como fórmula. */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

const DATE_UTC = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATETIME_SP = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SAO_PAULO_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// ─────────────────────── Formatação ─────────────────────
/** Decimal com vírgula e sem separador de milhar: `1234,56`. */
function formatDecimal(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function formatValue(value: CellValue, type: ColumnType): string {
  if (value === null || value === undefined) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return type === 'date'
      ? DATE_UTC.format(value)
      : DATETIME_SP.format(value).replace(',', '');
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    if (type === 'integer') return String(Math.trunc(value));
    return formatDecimal(value);
  }

  return value;
}

/**
 * Neutraliza injeção de fórmula: texto vindo do usuário (descrição de OS,
 * fornecedor) que comece com `=`, `+`, `-` ou `@` seria executado pelo Excel.
 * Só vale para colunas de texto — números negativos são legítimos.
 */
function neutralizeFormula(text: string, type: ColumnType): string {
  if (type !== 'text' || text.length === 0) return text;
  return FORMULA_TRIGGERS.includes(text[0]) ? `'${text}` : text;
}

function quoteIfNeeded(text: string): string {
  if (/[;"\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function formatCsvCell(value: CellValue, type: ColumnType): string {
  return quoteIfNeeded(neutralizeFormula(formatValue(value, type), type));
}

export function buildCsvHeader<T>(
  columns: readonly ColumnDefinition<T>[],
): string {
  return columns.map((c) => quoteIfNeeded(c.label)).join(CSV_SEPARATOR);
}

export function buildCsvRow<T>(
  columns: readonly ColumnDefinition<T>[],
  row: T,
): string {
  return columns
    .map((c) => formatCsvCell(c.value(row), c.type))
    .join(CSV_SEPARATOR);
}

// ─────────────────────── Writer ─────────────────────────
/**
 * Escreve o CSV em streaming, respeitando backpressure do destino.
 * Memória constante, independente do número de linhas.
 *
 * `footer` é a linha de totais: escrita por último e fora da contagem.
 */
export async function writeCsv<T>(
  out: Writable,
  columns: readonly ColumnDefinition<T>[],
  rows: AsyncIterable<T> | Iterable<T>,
  footer?: T,
): Promise<number> {
  let count = 0;

  await write(out, CSV_BOM + buildCsvHeader(columns) + CSV_EOL);
  for await (const row of rows) {
    await write(out, buildCsvRow(columns, row) + CSV_EOL);
    count++;
  }
  if (footer !== undefined) {
    await write(out, buildCsvRow(columns, footer) + CSV_EOL);
  }

  return count;
}

function write(out: Writable, chunk: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = out.write(chunk, 'utf8', (err) =>
      err ? reject(err) : undefined,
    );
    if (ok) resolve();
    else out.once('drain', resolve);
  });
}
