import { getAccessToken } from './apollo'

export type ExportFormat = 'csv' | 'xlsx'

export type ExportParams = Readonly<Record<string, string | number | undefined | null>>

/**
 * Mesma origem do GraphQL. Se VITE_API_URL aponta para `http://host/graphql`,
 * a exportação fica em `http://host/export/...`; sem ela, caminho relativo.
 */
function exportBaseUrl(): string {
  const api = import.meta.env.VITE_API_URL as string | undefined
  return api ? api.replace(/\/graphql\/?$/, '') : ''
}

function buildQuery(format: ExportFormat, params: ExportParams): string {
  const qs = new URLSearchParams({ format })
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
  }
  return qs.toString()
}

function filenameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? fallback
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] }
    const msg = Array.isArray(body.message) ? body.message.join(' ') : body.message
    if (msg) return msg
  } catch {
    // corpo não é JSON
  }
  if (res.status === 401) return 'Sessão expirada. Entre novamente para exportar.'
  if (res.status === 403) return 'Você não tem permissão para esta exportação.'
  return `Falha ao exportar (HTTP ${res.status}).`
}

/**
 * Baixa uma planilha do backend.
 *
 * Não é um `<a href>`: o access token vive em memória e só viaja no header
 * `Authorization`, que um link comum não envia (ADR 0002). O caminho é
 * fetch → Blob → object URL → clique sintético.
 */
export async function downloadExport(
  path: string,
  format: ExportFormat,
  params: ExportParams,
  fallbackName: string,
): Promise<void> {
  const res = await fetch(`${exportBaseUrl()}/export/${path}?${buildQuery(format, params)}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })

  if (!res.ok) throw new Error(await errorMessage(res))

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filenameFrom(res.headers.get('Content-Disposition'), `${fallbackName}.${format}`)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
