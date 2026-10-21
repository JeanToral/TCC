import type { MouseEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { cn } from '../../lib/utils'
import Skeleton from './Skeleton'

export interface DataTableColumn<T> {
  readonly key: string
  readonly header: string
  readonly cell: (row: T) => ReactNode
  readonly align?: 'left' | 'right'
  readonly className?: string
  /** Envolve a célula num link para `rowHref` — é o alvo de teclado da linha. */
  readonly link?: boolean
  /**
   * No celular a linha vira um bloco: `title` ocupa a linha inteira,
   * `meta` fica em linha logo abaixo e `hidden` some.
   */
  readonly mobile?: 'title' | 'meta' | 'hidden'
}

interface DataTableProps<T> {
  readonly label: string
  readonly columns: readonly DataTableColumn<T>[]
  readonly rows: readonly T[]
  readonly getRowKey: (row: T) => string | number
  /** Torna a linha inteira clicável. */
  readonly rowHref?: (row: T) => string
  readonly loading?: boolean
  /** Exibido quando não está carregando e não há linhas. */
  readonly empty?: ReactNode
  /** Linha de totais, uma célula por coluna. */
  readonly footer?: readonly ReactNode[]
  /** Desligar em tabelas dentro de uma seção da ficha. Padrão: true. */
  readonly stickyHeader?: boolean
}

const SKELETON_ROWS = 5

const MOBILE_CELL: Record<NonNullable<DataTableColumn<unknown>['mobile']>, string> = {
  title: 'max-sm:basis-full max-sm:text-[0.9375rem] max-sm:font-medium',
  meta: 'max-sm:text-xs max-sm:text-quiet',
  hidden: 'max-sm:hidden',
}

function isInteractive(target: EventTarget): boolean {
  return target instanceof Element && target.closest('a, button, input, select, textarea') !== null
}

export default function DataTable<T>({
  label,
  columns,
  rows,
  getRowKey,
  rowHref,
  loading = false,
  empty,
  footer,
  stickyHeader = true,
}: DataTableProps<T>) {
  const navigate = useNavigate()
  const showSkeleton = loading && rows.length === 0

  if (!loading && rows.length === 0 && empty) return <>{empty}</>

  function handleRowClick(e: MouseEvent<HTMLTableRowElement>, row: T) {
    if (!rowHref || isInteractive(e.target)) return
    navigate(rowHref(row))
  }

  return (
    <div className="sm:max-md:overflow-x-auto">
      <table aria-label={label} aria-busy={showSkeleton} className="w-full border-collapse text-sm max-sm:block">
        <thead className="max-sm:sr-only">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap border-b border-rule bg-subtle px-3 py-2 text-xs font-medium text-quiet',
                  stickyHeader && 'sticky top-[var(--topbar-height)] z-10',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="max-sm:block">
          {showSkeleton &&
            Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <tr key={i} className="border-b border-rule max-sm:block max-sm:px-4 max-sm:py-3">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5 max-sm:block max-sm:p-0 max-sm:py-1">
                    <Skeleton className={col.mobile === 'title' ? 'w-3/4' : 'w-1/2'} />
                  </td>
                ))}
              </tr>
            ))}

          {rows.map((row) => {
            const href = rowHref?.(row)
            return (
              <tr
                key={getRowKey(row)}
                onClick={href ? (e) => handleRowClick(e, row) : undefined}
                className={cn(
                  'border-b border-rule max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1 max-sm:px-4 max-sm:py-3',
                  href && 'cursor-pointer hover:bg-subtle',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    data-label={col.header}
                    className={cn(
                      'px-3 py-2.5 align-middle text-ink max-sm:p-0',
                      col.align === 'right' && 'text-right font-mono tabular-nums',
                      // No celular o cabeçalho some: número sem rótulo não diz nada.
                      col.align === 'right' &&
                        "max-sm:text-left max-sm:before:font-sans max-sm:before:text-faint max-sm:before:content-[attr(data-label)_':_']",
                      MOBILE_CELL[col.mobile ?? 'meta'],
                      col.className,
                    )}
                  >
                    {col.link && href ? (
                      <Link to={href} className="text-ink hover:text-primary hover:no-underline">
                        {col.cell(row)}
                      </Link>
                    ) : (
                      col.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>

        {footer && rows.length > 0 && (
          <tfoot className="max-sm:block">
            <tr className="border-t-2 border-ink font-semibold max-sm:flex max-sm:flex-wrap max-sm:gap-x-3 max-sm:px-4 max-sm:py-3">
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-3 py-2.5 text-ink max-sm:p-0',
                    col.align === 'right' && 'text-right font-mono tabular-nums',
                    col.mobile === 'hidden' && 'max-sm:hidden',
                  )}
                >
                  {footer[i]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {showSkeleton && <span className="sr-only" role="status">Carregando…</span>}
    </div>
  )
}
