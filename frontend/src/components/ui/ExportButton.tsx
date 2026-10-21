import { useEffect, useRef, useState } from 'react'

import Button from './Button'
import { downloadExport, type ExportFormat, type ExportParams } from '../../lib/download'

interface ExportButtonProps {
  /** Caminho do relatório no backend, ex.: `work-orders`. */
  readonly path: string
  /** Filtros ativos na tela — a exportação leva exatamente o que se vê filtrado. */
  readonly params: ExportParams
  /** Nome usado se o servidor não informar o arquivo. */
  readonly fallbackName: string
  readonly disabled?: boolean
}

const OPTIONS: readonly { readonly format: ExportFormat; readonly label: string; readonly hint: string }[] = [
  { format: 'xlsx', label: 'Excel (.xlsx)', hint: 'Números e datas prontos para somar e filtrar' },
  { format: 'csv', label: 'CSV (.csv)', hint: 'Texto simples, separado por ponto e vírgula' },
]

export default function ExportButton({ path, params, fallbackName, disabled }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [error, setError] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleExport(format: ExportFormat) {
    setOpen(false)
    setError('')
    setBusy(format)
    try {
      await downloadExport(path, format, params, fallbackName)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="secondary"
        onClick={() => setOpen((o) => !o)}
        loading={busy !== null}
        disabled={disabled || busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? 'Exportando…' : 'Exportar'}
      </Button>

      {open && (
        <ul className="absolute top-full right-0 z-50 mt-1 w-60 rounded-xs border border-rule bg-sheet p-1 shadow-lg" role="menu">
          {OPTIONS.map((opt) => (
            <li key={opt.format} role="none">
              <button
                type="button"
                role="menuitem"
                className="flex w-full flex-col items-start gap-0.5 rounded-xs px-2.5 py-2 text-left hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none"
                onClick={() => void handleExport(opt.format)}
              >
                <span className="text-sm font-medium text-ink">{opt.label}</span>
                <span className="text-xs text-quiet">{opt.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="absolute top-full right-0 z-40 mt-1 w-64 border-l-[3px] border-error bg-error-soft px-3 py-2 text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
