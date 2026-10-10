// ─────────────────────── Types ───────────────────────────
/**
 * - `date`: data sem hora, formatada em UTC (ex.: competência gravada como
 *   meia-noite UTC — formatar no fuso de Brasília mostraria o dia anterior).
 * - `datetime`: instante, formatado no fuso de Brasília.
 */
export type ColumnType =
  | 'text'
  | 'integer'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime';

export type CellValue = string | number | Date | null;

export interface ColumnDefinition<T> {
  readonly key: string;
  readonly label: string;
  readonly type: ColumnType;
  /** Largura em caracteres no XLSX. Em streaming não dá para medir o conteúdo. */
  readonly width?: number;
  readonly value: (row: T) => CellValue;
}

export interface ExportFilterDescription {
  readonly label: string;
  readonly value: string;
}

export interface ExportMetadata {
  readonly title: string;
  readonly generatedAt: Date;
  readonly generatedBy: string;
  readonly filters: readonly ExportFilterDescription[];
  /** Avisos que acompanham o arquivo (ex.: cobertura de custo incompleta). */
  readonly notes?: readonly string[];
}

export type ExportFormat = 'csv' | 'xlsx';

// ─────────────────────── Constants ──────────────────────
/** Teto de linhas por exportação — ver ADR 0002. */
export const EXPORT_ROW_LIMIT = 50_000;

/** Tamanho do lote lido do banco a cada iteração. */
export const EXPORT_BATCH_SIZE = 1_000;

export const SAO_PAULO_TZ = 'America/Sao_Paulo';

export const DEFAULT_WIDTH: Record<ColumnType, number> = {
  text: 28,
  integer: 10,
  number: 12,
  currency: 16,
  date: 13,
  datetime: 18,
};
