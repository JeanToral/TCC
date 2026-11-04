import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import PreventivePlansListPage from './PreventivePlansListPage'
import { GENERATE_DUE_PREVENTIVE_WORK_ORDERS } from '../../graphql/preventive-plans/GenerateDuePreventiveWorkOrders.gql'
import { GET_PREVENTIVE_PLANS } from '../../graphql/preventive-plans/GetPreventivePlans.gql'
import type { PreventivePlan } from '../../graphql/preventive-plans/types'
import { renderWithProviders } from '../../test/renderWithProviders'

const makePlan = (overrides: Partial<PreventivePlan> = {}): PreventivePlan =>
  ({
    id: 1,
    name: 'Lubrificação mensal',
    description: null,
    assetId: 3,
    asset: { id: 3, name: 'Injetora 03', tag: 'INJ-003' },
    intervalDays: 30,
    lastGeneratedAt: null,
    nextDueAt: '2020-01-01T00:00:00.000Z',
    isActive: true,
    ...overrides,
  }) as PreventivePlan

const PLANS = [makePlan(), makePlan({ id: 2, name: 'Troca de filtro', nextDueAt: '2099-01-01T00:00:00.000Z', isActive: false })]

function plansMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_PREVENTIVE_PLANS },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { preventivePlans: PLANS } },
  }
}

describe('PreventivePlansListPage', () => {
  it('deve marcar o plano vencido e contar no cabeçalho', async () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlansListPage />, { permissions: ['preventiveplan.read'], mocks: [plansMock()] })

    // Assert
    await screen.findByText('Lubrificação mensal')
    expect(screen.getByText('1 vencido')).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Vencido')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Inativo')).toBeInTheDocument()
  })

  it('deve ligar à edição só para quem tem preventiveplan.update', async () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlansListPage />, { permissions: ['preventiveplan.update'], mocks: [plansMock()] })

    // Assert
    expect(await screen.findByRole('link', { name: 'Lubrificação mensal' })).toHaveAttribute(
      'href',
      '/dashboard/preventive-plans/1/edit',
    )
  })

  it('não deve ligar à edição para quem só lê', async () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlansListPage />, { permissions: ['preventiveplan.read'], mocks: [plansMock()] })
    await screen.findByText('Lubrificação mensal')

    // Assert
    expect(screen.queryByRole('link', { name: 'Lubrificação mensal' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gerar OS vencidas' })).toBeNull()
  })

  async function generateWith(result: { generated: number; skipped: number; failedPlans: string[] }) {
    const generated: MockLink.MockedResponse = {
      request: { query: GENERATE_DUE_PREVENTIVE_WORK_ORDERS },
      result: { data: { generateDuePreventiveWorkOrders: result } },
    }
    const { user } = renderWithProviders(<PreventivePlansListPage />, {
      permissions: ['preventiveplan.read', 'workorder.create'],
      mocks: [plansMock(), generated],
    })
    await screen.findByText('Lubrificação mensal')
    await user.click(screen.getByRole('button', { name: 'Gerar OS vencidas' }))
  }

  it('deve gerar as OS vencidas e informar geradas e puladas', async () => {
    // Arrange / Act
    await generateWith({ generated: 2, skipped: 1, failedPlans: [] })

    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent(
      '2 OS preventivas geradas · 1 plano pulado por já ter OS aberta.',
    )
  })

  it('deve informar quando não há plano vencido', async () => {
    // Arrange / Act
    await generateWith({ generated: 0, skipped: 0, failedPlans: [] })

    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent('Nenhum plano vencido.')
  })

  it('deve mostrar as falhas como erro, sem dizer que não há plano vencido', async () => {
    // Arrange / Act
    await generateWith({ generated: 0, skipped: 0, failedPlans: ['Lubrificação mensal', 'Troca de filtro'] })

    // Assert
    expect(
      await screen.findByText('Falha ao gerar OS de: Lubrificação mensal, Troca de filtro. Veja o log do servidor.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nenhum plano vencido.')).toBeNull()
  })
})
