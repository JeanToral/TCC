import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ExportButton from './ExportButton'
import { downloadExport } from '../../lib/download'
import { setAccessToken } from '../../lib/apollo'

vi.mock('../../lib/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/download')>()
  return { ...actual, downloadExport: vi.fn() }
})

const mockedDownload = vi.mocked(downloadExport)

// A implementação real, para testar o helper isoladamente do botão.
const { downloadExport: realDownload } = await vi.importActual<
  typeof import('../../lib/download')
>('../../lib/download')

// ── ExportButton ───────────────────────────────────────────
describe('ExportButton', () => {
  // mockClear, não mockReset: no Vitest 5 o reset faz a rejeição configurada
  // depois por mockRejectedValue escapar como falha do próprio teste.
  beforeEach(() => {
    mockedDownload.mockClear()
    mockedDownload.mockResolvedValue()
  })

  it('deve abrir o menu com as opções Excel e CSV', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<ExportButton path="work-orders" params={{}} fallbackName="os" />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Exportar' }))

    // Assert
    expect(screen.getByRole('menuitem', { name: /Excel \(\.xlsx\)/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /CSV \(\.csv\)/ })).toBeInTheDocument()
  })

  it('deve enviar os filtros aplicados na requisição de exportação', async () => {
    // Arrange
    mockedDownload.mockResolvedValue()
    const user = userEvent.setup()
    render(
      <ExportButton path="work-orders" params={{ status: 'COMPLETED' }} fallbackName="os" />,
    )

    // Act
    await user.click(screen.getByRole('button', { name: 'Exportar' }))
    await user.click(screen.getByRole('menuitem', { name: /Excel/ }))

    // Assert
    expect(mockedDownload).toHaveBeenCalledWith(
      'work-orders',
      'xlsx',
      { status: 'COMPLETED' },
      'os',
    )
  })

  it('deve exportar em CSV quando essa opção é escolhida', async () => {
    // Arrange
    mockedDownload.mockResolvedValue()
    const user = userEvent.setup()
    render(<ExportButton path="work-orders" params={{}} fallbackName="os" />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Exportar' }))
    await user.click(screen.getByRole('menuitem', { name: /CSV/ }))

    // Assert
    expect(mockedDownload).toHaveBeenCalledWith('work-orders', 'csv', {}, 'os')
  })

  it('deve exibir erro quando a exportação falha', async () => {
    // Arrange
    mockedDownload.mockRejectedValue(new Error('Refine o período — o limite é de 50.000 linhas.'))
    const user = userEvent.setup()
    render(<ExportButton path="work-orders" params={{}} fallbackName="os" />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Exportar' }))
    await user.click(screen.getByRole('menuitem', { name: /Excel/ }))

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Refine o período')
  })

  it('deve bloquear o botão enquanto exporta', async () => {
    // Arrange — download que só termina quando o teste mandar
    let finish: () => void = () => undefined
    mockedDownload.mockImplementation(() => new Promise<void>((r) => (finish = r)))
    const user = userEvent.setup()
    render(<ExportButton path="work-orders" params={{}} fallbackName="os" />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Exportar' }))
    await user.click(screen.getByRole('menuitem', { name: /Excel/ }))

    // Assert
    expect(screen.getByRole('button', { name: /Exportando/ })).toBeDisabled()
    finish()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar' })).toBeEnabled())
  })

  it('deve fechar o menu com Escape', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<ExportButton path="work-orders" params={{}} fallbackName="os" />)
    await user.click(screen.getByRole('button', { name: 'Exportar' }))

    // Act
    await user.keyboard('{Escape}')

    // Assert
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

// ── downloadExport ─────────────────────────────────────────
/**
 * Resposta mínima: o Blob do jsdom não tem `.stream()`, que o Response nativo
 * do Node exige — misturar os dois quebra. Só o que o helper usa.
 */
function fakeResponse(opts: {
  readonly status: number
  readonly json?: unknown
  readonly disposition?: string
}): Response {
  return {
    ok: opts.status >= 200 && opts.status < 300,
    status: opts.status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-disposition' ? (opts.disposition ?? null) : null,
    },
    blob: async () => new Blob(['conteúdo']),
    json: async () => {
      if (opts.json === undefined) throw new SyntaxError('sem corpo')
      return opts.json
    },
  } as unknown as Response
}

describe('downloadExport', () => {
  const fetchMock = vi.fn()
  const createObjectURL = vi.fn(() => 'blob:fake')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    fetchMock.mockReset()
    setAccessToken('token-de-teste')
  })

  afterEach(() => vi.unstubAllGlobals())

  it('deve enviar o access token no header Authorization', async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      fakeResponse({ status: 200, disposition: 'attachment; filename="os_2026-10-10.csv"' }),
    )

    // Act
    await realDownload('work-orders', 'csv', { status: 'COMPLETED' }, 'os')

    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/export/work-orders?format=csv&status=COMPLETED')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-de-teste')
  })

  it('deve omitir filtros vazios da query string', async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse({ status: 200 }))

    // Act
    await realDownload('work-orders', 'xlsx', { status: undefined, assetId: '' }, 'os')

    // Assert
    expect(fetchMock.mock.calls[0][0]).toBe('/export/work-orders?format=xlsx')
  })

  it('deve propagar a mensagem de erro do servidor', async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      fakeResponse({ status: 400, json: { statusCode: 400, message: 'Refine o período' } }),
    )

    // Act & Assert
    await expect(realDownload('work-orders', 'csv', {}, 'os')).rejects.toThrow('Refine o período')
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('deve traduzir 403 sem corpo em mensagem amigável', async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse({ status: 403 }))

    // Act & Assert
    await expect(realDownload('work-orders', 'csv', {}, 'os')).rejects.toThrow(
      'Você não tem permissão',
    )
  })

  it('deve usar o nome de arquivo informado pelo servidor', async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      fakeResponse({ status: 200, disposition: 'attachment; filename="os_2025-01-01_2025-12-31.xlsx"' }),
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    let downloaded = ''
    click.mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download
    })

    // Act
    await realDownload('work-orders', 'xlsx', {}, 'os')

    // Assert
    expect(downloaded).toBe('os_2025-01-01_2025-12-31.xlsx')
    click.mockRestore()
  })

  it('deve liberar o object URL depois do download', async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse({ status: 200 }))

    // Act
    await realDownload('work-orders', 'csv', {}, 'os')

    // Assert
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })
})
