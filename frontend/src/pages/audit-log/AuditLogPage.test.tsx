import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import AuditLogPage from './AuditLogPage'
import { GET_AUDIT_LOGS } from '../../graphql/audit-log/GetAuditLogs.gql'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Fixtures ───────────────────────────────────────────────
const ADMIN = { __typename: 'AuditLogActorType', id: 1, name: 'Admin', email: 'admin@cmms.com' }

const ROLE_UPDATE = {
  __typename: 'AuditLogType',
  id: 12,
  action: 'role.update',
  targetType: 'Role',
  targetId: 3,
  before: '{"permissions":["asset.read"]}',
  after: '{"permissions":["asset.read","asset.update"]}',
  createdAt: '2026-10-19T14:30:00.000Z',
  user: ADMIN,
}

const WO_APPROVE = {
  __typename: 'AuditLogType',
  id: 11,
  action: 'workorder.approve',
  targetType: 'WorkOrder',
  targetId: 41,
  before: null,
  after: null,
  createdAt: '2026-10-18T09:00:00.000Z',
  user: ADMIN,
}

function page(
  nodes: readonly object[],
  vars: Record<string, unknown> = {},
  hasNextPage = false,
): MockLink.MockedResponse {
  return {
    request: { query: GET_AUDIT_LOGS, variables: { first: 50, ...vars } },
    result: {
      data: {
        auditLogs: {
          __typename: 'AuditLogConnection',
          edges: nodes.map((node, i) => ({ __typename: 'AuditLogEdge', cursor: `c${i}`, node })),
          pageInfo: {
            __typename: 'AuditLogPageInfo',
            hasNextPage,
            endCursor: nodes.length > 0 ? `c${nodes.length - 1}` : null,
          },
        },
      },
    },
  }
}

// ── Suite ──────────────────────────────────────────────────
describe('AuditLogPage', () => {
  it('deve bloquear quem não tem auditlog.read', () => {
    // Arrange / Act
    renderWithProviders(<AuditLogPage />, { permissions: ['user.read'] })

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('não tem permissão')
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('deve listar os registros com autor, ação traduzida e link para o alvo', async () => {
    // Arrange
    renderWithProviders(<AuditLogPage />, {
      permissions: ['*'],
      mocks: [page([ROLE_UPDATE, WO_APPROVE])],
    })

    // Act
    const table = await screen.findByRole('table')

    // Assert
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Role alterada')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Admin')).toBeInTheDocument()
    expect(within(rows[0]).getByRole('link', { name: 'Role #3' })).toHaveAttribute('href', '/dashboard/roles/3')
    expect(within(rows[1]).getByRole('link', { name: 'Ordem de Serviço #41' })).toHaveAttribute(
      'href',
      '/dashboard/work-orders/41',
    )
    expect(within(rows[1]).queryByRole('button', { name: 'Ver alterações' })).toBeNull()
  })

  it('deve abrir o antes e depois formatados ao clicar em Ver alterações', async () => {
    // Arrange
    const { user } = renderWithProviders(<AuditLogPage />, {
      permissions: ['auditlog.read'],
      mocks: [page([ROLE_UPDATE])],
    })

    // Act
    await user.click(await screen.findByRole('button', { name: 'Ver alterações' }))

    // Assert
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Registro #12')).toBeInTheDocument()
    expect(within(dialog).getByText(/"asset.update"/)).toBeInTheDocument()
  })

  it('deve refazer a busca ao filtrar por tipo de registro', async () => {
    // Arrange
    const { user } = renderWithProviders(<AuditLogPage />, {
      permissions: ['auditlog.read'],
      mocks: [page([ROLE_UPDATE, WO_APPROVE]), page([WO_APPROVE], { targetType: 'WorkOrder' })],
    })
    await screen.findByText('Role alterada')

    // Act
    await user.selectOptions(screen.getByLabelText('Tipo de registro'), 'WorkOrder')

    // Assert
    await screen.findByText('1 registro')
    expect(screen.queryByText('Role alterada')).toBeNull()
    expect(screen.getByText('OS aprovada')).toBeInTheDocument()
  })

  it('deve mostrar estado vazio quando não houver registros', async () => {
    // Arrange / Act
    renderWithProviders(<AuditLogPage />, { permissions: ['auditlog.read'], mocks: [page([])] })

    // Assert
    expect(await screen.findByText('Nenhum registro encontrado.')).toBeInTheDocument()
  })
})
