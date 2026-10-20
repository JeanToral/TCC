import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import WorkOrderFlow from './WorkOrderFlow'
import type { WorkOrderDetail } from '../../graphql/work-orders/types'

const makeWorkOrder = (overrides: Partial<WorkOrderDetail> = {}): WorkOrderDetail =>
  ({
    id: 41,
    title: 'Troca de rolamento',
    status: 'REQUESTED',
    createdAt: '2026-03-09T12:00:00.000Z',
    scheduledStart: null,
    startedAt: null,
    completedAt: null,
    rejectionReason: null,
    cancellationReason: null,
    ...overrides,
  }) as WorkOrderDetail

function states(): string[] {
  const flow = screen.getByRole('list', { name: 'Fluxo da ordem de serviço' })
  return within(flow)
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('data-state') ?? '')
}

describe('WorkOrderFlow', () => {
  it('deve exibir as 5 etapas do fluxo na ordem', () => {
    // Arrange / Act
    render(<WorkOrderFlow workOrder={makeWorkOrder()} />)

    // Assert
    const items = screen.getAllByRole('listitem')
    const expected = ['Pedido', 'Aprovação', 'Planejamento', 'Execução', 'Registro']
    expect(items).toHaveLength(5)
    items.forEach((li, i) => expect(li).toHaveTextContent(expected[i]))
  })

  it.each([
    ['REQUESTED', ['current', 'pending', 'pending', 'pending', 'pending']],
    ['APPROVED', ['done', 'current', 'pending', 'pending', 'pending']],
    ['SCHEDULED', ['done', 'done', 'current', 'pending', 'pending']],
    ['IN_PROGRESS', ['done', 'done', 'done', 'current', 'pending']],
    ['COMPLETED', ['done', 'done', 'done', 'done', 'done']],
  ] as const)('deve marcar as etapas de uma OS %s', (status, expected) => {
    // Arrange / Act
    render(<WorkOrderFlow workOrder={makeWorkOrder({ status })} />)

    // Assert
    expect(states()).toEqual(expected)
  })

  it('deve indicar a etapa atual para leitores de tela', () => {
    // Arrange / Act
    render(<WorkOrderFlow workOrder={makeWorkOrder({ status: 'SCHEDULED' })} />)

    // Assert
    const current = screen.getAllByRole('listitem').find((li) => li.getAttribute('aria-current') === 'step')
    expect(current).toHaveTextContent('Planejamento')
  })

  it('deve carimbar a OS rejeitada e mostrar o motivo', () => {
    // Arrange / Act
    render(
      <WorkOrderFlow
        workOrder={makeWorkOrder({ status: 'REJECTED', rejectionReason: 'Duplicada da OS-0040' })}
      />,
    )

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Rejeitada')
    expect(screen.getByText('Duplicada da OS-0040')).toBeInTheDocument()
    expect(states()).toEqual(['done', 'pending', 'pending', 'pending', 'pending'])
  })

  it('deve manter como concluídas as etapas que a OS cancelada chegou a cumprir', () => {
    // Arrange / Act
    render(
      <WorkOrderFlow
        workOrder={makeWorkOrder({
          status: 'CANCELLED',
          scheduledStart: '2026-03-10T08:00:00.000Z',
          startedAt: '2026-03-10T09:00:00.000Z',
          cancellationReason: 'Máquina desativada',
        })}
      />,
    )

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Cancelada')
    expect(states()).toEqual(['done', 'done', 'done', 'done', 'pending'])
  })

  it('não deve exibir carimbo em OS ativa', () => {
    // Arrange / Act
    render(<WorkOrderFlow workOrder={makeWorkOrder({ status: 'IN_PROGRESS' })} />)

    // Assert
    expect(screen.queryByRole('status')).toBeNull()
  })
})
