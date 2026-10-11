import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TooltipPayloadEntry } from 'recharts'

import Spinner from '../ui/Spinner'
import './ChartCard.css'

// ── Legenda ───────────────────────────────────────────────
export interface LegendItem {
  readonly label: string
  /** Token CSS da série, ex.: `var(--chart-1)`. */
  readonly color: string
  /** A chave espelha a marca: retângulo para barras, traço para linhas. */
  readonly shape: 'bar' | 'line'
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
    <section className="chart-card" aria-label={title}>
      <header className="chart-card__header">
        <h2 className="chart-card__title">{title}</h2>
        {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
        {legend && legend.length > 1 && !isEmpty && (
          <ul className="chart-card__legend" aria-hidden="true">
            {legend.map((item) => (
              <li key={item.label} className="chart-card__legend-item">
                <span
                  className={`chart-card__key chart-card__key--${item.shape}`}
                  style={{ background: item.color }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div
        className={`chart-card__body${loading && !firstLoad ? ' chart-card__body--refreshing' : ''}`}
        aria-hidden="true"
      >
        {firstLoad && (
          <div className="chart-card__state">
            <Spinner />
          </div>
        )}
        {!firstLoad && error && <div className="chart-card__state chart-card__state--error">{error}</div>}
        {!firstLoad && !error && isEmpty && <div className="chart-card__state">{emptyMessage}</div>}
        {!firstLoad && !error && !isEmpty && children}
      </div>

      {(footnote || reportHref) && (
        <footer className="chart-card__footer">
          {footnote && <p className="chart-card__footnote">{footnote}</p>}
          {reportHref && (
            <Link to={reportHref} className="chart-card__report-link">
              Ver relatório →
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
    <div className="chart-tooltip">
      {title && <div className="chart-tooltip__title">{title}</div>}
      <ul className="chart-tooltip__rows">
        {[...payload].reverse().map((entry) => (
          <li key={String(entry.dataKey ?? entry.name)} className="chart-tooltip__row">
            <span
              className={`chart-card__key chart-card__key--${shape}`}
              style={{ background: entry.color }}
            />
            <strong className="chart-tooltip__value">
              {typeof entry.value === 'number' ? formatValue(entry.value) : '—'}
            </strong>
            {payload.length > 1 && <span className="chart-tooltip__name">{entry.name}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
