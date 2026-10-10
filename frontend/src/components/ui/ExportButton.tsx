import { useEffect, useRef, useState } from 'react'

import Button from './Button'
import { downloadExport, type ExportFormat, type ExportParams } from '../../lib/download'
import './ExportButton.css'

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
    <div className="export-button" ref={rootRef}>
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
        <ul className="export-button__menu" role="menu">
          {OPTIONS.map((opt) => (
            <li key={opt.format} role="none">
              <button
                type="button"
                role="menuitem"
                className="export-button__item"
                onClick={() => void handleExport(opt.format)}
              >
                <span className="export-button__label">{opt.label}</span>
                <span className="export-button__hint">{opt.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="export-button__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
