import { Children, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TooltipPayloadEntry } from 'recharts'

import { cn } from '../../lib/utils'
import Skeleton from '../ui/Skeleton'

// ── Legenda ───────────────────────────────────────────────
export interface LegendItem {
  readonly label: string
  /** Token CSS da série, ex.: `var(--chart-1)`. */
  readonly color: string
  /** A chave espelha a marca: retângulo para barras, traço para linhas. */
  readonly shape: 'bar' | 'line'
}

function LegendKey({ shape, color }: { readonly shape: LegendItem['shape']; readonly color: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0', shape === 'bar' ? 'size-2.5 rounded-[1px]' : 'h-0.5 w-3.5')}
      style={{ background: color }}
    />
  )
}

// ── Tabela acessível (gêmea do gráfico) ───────────────────
export interface ChartTable {
  readonly headers: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

export interface ChartCardProps {
  readonly title: string
  readonly subtitle?: string
  /** Só com duas ou mais séries — uma série é nomeada pelo título. */
  readonly legend?: readonly LegendItem[]
  readonly loading: boolean
  readonly error?: string
  readonly isEmpty: boolean
  readonly emptyMessage: string
  readonly table: ChartTable
  readonly footnote?: ReactNode
  /** Leva ao relatório completo, com os mesmos filtros. */
  readonly reportHref?: string
  readonly children: ReactNode
}

export function ChartCard({
  title,
  subtitle,
  legend,
  loading,
  error,
  isEmpty,
  emptyMessage,
  table,
  footnote,
  reportHref,
  children,
}: ChartCardProps) {
  const firstLoad = loading && isEmpty

  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-3 px-5 pt-4 pb-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="sheet-numbered font-mono text-xs font-medium uppercase tracking-wider text-quiet">{title}</h2>
        {legend && legend.length > 1 && !isEmpty && (
          <ul className="ml-auto flex gap-3.5" aria-hidden="true">
            {legend.map((item) => (
              <li key={item.label} className="inline-flex items-center gap-1.5 text-xs text-quiet">
                <LegendKey shape={item.shape} color={item.color} />
                {item.label}
              </li>
            ))}
          </ul>
        )}
        {subtitle && <p className="order-1 basis-full text-xs text-quiet">{subtitle}</p>}
      </header>

      {/* Altura em rem: acompanha o tamanho de fonte escolhido, eixos incluídos. */}
      <div
        className={cn(
          'relative h-64 transition-opacity [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:focus]:outline-none',
          loading && !firstLoad && 'opacity-50',
        )}
        aria-hidden="true"
      >
        {firstLoad && <Skeleton className="h-full" />}
        {!firstLoad && error && <ChartState className="text-error">{error}</ChartState>}
        {!firstLoad && !error && isEmpty && <ChartState>{emptyMessage}</ChartState>}
        {!firstLoad && !error && !isEmpty && children}
      </div>

      {(footnote || reportHref) && (
        <footer className="flex items-baseline justify-between gap-4">
          {footnote && <p className="text-xs text-quiet">{footnote}</p>}
          {reportHref && (
            <Link to={reportHref} className="ml-auto whitespace-nowrap text-[0.8125rem] font-medium">
              Ver relatório
            </Link>
          )}
        </footer>
      )}

      {!isEmpty && (
        <table className="sr-only">
          <caption>{title}</caption>
          <thead>
            <tr>
              {table.headers.map((h) => (
                <th key={h} scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={table.headers[i]}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function ChartState({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn('flex h-full items-center justify-center px-4 text-center text-[0.8125rem] text-faint', className)}>
      {children}
    </div>
  )
}

/** Grade de gráficos de uma folha: duas colunas no desktop, divididas por régua. */
export function ChartGrid({ children }: { readonly children: ReactNode }) {
  const single = Children.toArray(children).filter(Boolean).length === 1
  return (
    <div
      className={cn(
        'grid border-t border-rule [nav+&]:border-t-0 [&>*]:border-b [&>*]:border-rule [&>*:last-child]:border-b-0',
        !single && 'lg:grid-cols-2 lg:[&>*:nth-child(odd)]:border-r lg:[&>*:nth-last-child(2):nth-child(odd)]:border-b-0',
      )}
    >
      {children}
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────
export interface ChartTooltipProps {
  readonly active?: boolean
  readonly label?: string | number
  readonly payload?: readonly TooltipPayloadEntry[]
  readonly formatLabel?: (label: string) => string
  readonly formatValue: (value: number) => string
  readonly shape?: 'bar' | 'line'
}

/** O valor vem primeiro e em destaque; o nome da série é secundário. */
export function ChartTooltip({
  active,
  label,
  payload,
  formatLabel,
  formatValue,
  shape = 'bar',
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const title = label === undefined ? '' : formatLabel ? formatLabel(String(label)) : String(label)

  return (
    <div className="min-w-32 rounded-xs border border-rule bg-sheet px-2.5 py-2 shadow-md">
      {title && <div className="mb-1 text-xs text-quiet">{title}</div>}
      <ul className="flex flex-col gap-1">
        {[...payload].reverse().map((entry) => (
          <li key={String(entry.dataKey ?? entry.name)} className="flex items-center gap-1.5">
            <LegendKey shape={shape} color={entry.color ?? 'currentColor'} />
            <strong className="font-mono text-sm tabular-nums text-ink">
              {typeof entry.value === 'number' ? formatValue(entry.value) : '—'}
            </strong>
            {payload.length > 1 && <span className="text-xs text-quiet">{entry.name}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
