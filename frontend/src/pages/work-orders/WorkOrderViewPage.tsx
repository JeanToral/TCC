import { type ReactNode, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import { Ellipsis } from 'lucide-react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import PriorityMark from '../../components/ui/PriorityMark'
import { Sheet, SheetHeader, SheetSection } from '../../components/ui/Sheet'
import Skeleton from '../../components/ui/Skeleton'
import {
  ApproveModal,
  CancelModal,
  CompleteModal,
  RejectModal,
  ScheduleModal,
  StartModal,
  type ScheduleForm,
} from '../../components/work-orders/WorkOrderActionModals'
import WorkOrderCostsSection from '../../components/work-orders/WorkOrderCostsSection'
import WorkOrderFlow from '../../components/work-orders/WorkOrderFlow'
import { useAuth } from '../../contexts/AuthContext'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import type { GetUsersData } from '../../graphql/users/types'
import { APPROVE_WORK_ORDER } from '../../graphql/work-orders/ApproveWorkOrder.gql'
import { CANCEL_WORK_ORDER } from '../../graphql/work-orders/CancelWorkOrder.gql'
import { COMPLETE_WORK_ORDER } from '../../graphql/work-orders/CompleteWorkOrder.gql'
import { GET_WORK_ORDER } from '../../graphql/work-orders/GetWorkOrder.gql'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import { REJECT_WORK_ORDER } from '../../graphql/work-orders/RejectWorkOrder.gql'
import { SCHEDULE_WORK_ORDER } from '../../graphql/work-orders/ScheduleWorkOrder.gql'
import { START_WORK_ORDER } from '../../graphql/work-orders/StartWorkOrder.gql'
import type {
  ApproveWorkOrderData,
  CancelWorkOrderData,
  CompleteWorkOrderData,
  GetWorkOrderData,
  RejectWorkOrderData,
  ScheduleWorkOrderData,
  StartWorkOrderData,
} from '../../graphql/work-orders/types'
import { errorMessage } from '../../lib/utils'
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_VARIANT,
  WORK_ORDER_TYPE_LABELS,
  formatWorkOrderCode,
} from '../../lib/work-order-labels'

// ── Helpers ────────────────────────────────────────────────
const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function formatDateTime(iso: string | null): string {
  return iso ? DATE_TIME.format(new Date(iso)) : '—'
}

const EMPTY_SCHEDULE: ScheduleForm = { assignedToId: '', scheduledStart: undefined, scheduledEnd: undefined }

// ── PermButton ─────────────────────────────────────────────
function PermButton({
  permission,
  variant,
  onClick,
  children,
}: {
  readonly permission: string
  readonly variant?: 'primary' | 'secondary' | 'danger'
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  const { hasPermission } = useAuth()
  const allowed = hasPermission(permission)
  return (
    <span title={allowed ? undefined : 'Você não tem permissão para esta ação'} className={allowed ? undefined : 'cursor-not-allowed'}>
      <Button variant={variant} onClick={onClick} disabled={!allowed} className={allowed ? undefined : 'pointer-events-none'}>
        {children}
      </Button>
    </span>
  )
}

/** Coluna lateral da ficha: pares rótulo/valor. */
function FactList({ items }: { readonly items: readonly { readonly label: string; readonly value: ReactNode }[] }) {
  return (
    <dl className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <dt className="text-[0.6875rem] font-medium uppercase tracking-wider text-faint">{item.label}</dt>
          <dd className="text-sm text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function DetailSkeleton() {
  return (
    <Sheet>
      <div className="flex flex-col gap-3 border-b border-rule p-5" role="status" aria-label="Carregando">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-5 gap-2 p-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </Sheet>
  )
}

// ── Page ───────────────────────────────────────────────────
export default function WorkOrderViewPage() {
  const { id } = useParams<{ id: string }>()

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [laborHours, setLaborHours] = useState('')
  const { hasPermission } = useAuth()
  const [cancelReason, setCancelReason] = useState('')
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(EMPTY_SCHEDULE)
  const [actionError, setActionError] = useState('')

  const refetchList = [{ query: GET_WORK_ORDERS }]

  const { data, loading, error } = useQuery<GetWorkOrderData>(GET_WORK_ORDER, {
    variables: { id: Number(id) },
    skip: !id,
  })

  const { data: usersData } = useQuery<GetUsersData>(GET_USERS, {
    skip: !scheduleOpen,
  })

  const [approveWorkOrder, { loading: approving }] = useMutation<ApproveWorkOrderData>(APPROVE_WORK_ORDER, {
    variables: { id: Number(id) },
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => setApproveOpen(false),
    onError: (e) => setActionError(errorMessage(e)),
  })

  const [rejectWorkOrder, { loading: rejecting }] = useMutation<RejectWorkOrderData>(REJECT_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => { setRejectOpen(false); setRejectReason('') },
    onError: (e) => setActionError(errorMessage(e)),
  })

  const [scheduleWorkOrder, { loading: scheduling }] = useMutation<ScheduleWorkOrderData>(SCHEDULE_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => { setScheduleOpen(false); setScheduleForm(EMPTY_SCHEDULE) },
    onError: (e) => setActionError(errorMessage(e)),
  })

  const [startWorkOrder, { loading: starting }] = useMutation<StartWorkOrderData>(START_WORK_ORDER, {
    variables: { id: Number(id) },
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => setStartOpen(false),
    onError: (e) => setActionError(errorMessage(e)),
  })

  const [completeWorkOrder, { loading: completing }] = useMutation<CompleteWorkOrderData>(COMPLETE_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => { setCompleteOpen(false); setClosingNotes(''); setLaborHours('') },
    onError: (e) => setActionError(errorMessage(e)),
  })

  const [cancelWorkOrder, { loading: cancelling }] = useMutation<CancelWorkOrderData>(CANCEL_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => { setCancelOpen(false); setCancelReason('') },
    onError: (e) => setActionError(errorMessage(e)),
  })

  if (loading) return <DetailSkeleton />

  if (error || !data?.workOrder) {
    return (
      <Sheet>
        <EmptyState
          message={error ? `Erro ao carregar a OS: ${error.message}` : 'Ordem de serviço não encontrada.'}
          action={<Link to="/dashboard/work-orders">Voltar para Ordens de Serviço</Link>}
        />
      </Sheet>
    )
  }

  const wo = data.workOrder

  function openReject() { setActionError(''); setRejectReason(''); setRejectOpen(true) }
  function openCancel() { setActionError(''); setCancelReason(''); setCancelOpen(true) }
  function openSchedule() {
    setActionError('')
    setScheduleForm({
      assignedToId: wo.assignedToId ? String(wo.assignedToId) : '',
      scheduledStart: wo.scheduledStart ? new Date(wo.scheduledStart) : undefined,
      scheduledEnd: wo.scheduledEnd ? new Date(wo.scheduledEnd) : undefined,
    })
    setScheduleOpen(true)
  }
  const users = usersData?.users ?? []

  const canCancel = ['REQUESTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS'].includes(wo.status)

  return (
    <>
      <Sheet>
        <SheetHeader
          eyebrow="Ordem de Serviço"
          code={formatWorkOrderCode(wo.id)}
          title={wo.title}
          meta={[
            { label: 'Situação', value: <Badge variant={WORK_ORDER_STATUS_VARIANT[wo.status]}>{WORK_ORDER_STATUS_LABELS[wo.status]}</Badge> },
            { label: 'Prioridade', value: <PriorityMark priority={wo.priority} /> },
            { label: 'Tipo', value: WORK_ORDER_TYPE_LABELS[wo.type] },
            { label: 'Solicitante', value: wo.requestedBy.name },
          ]}
        />

        {/* Trilho do fluxo + ação da etapa atual */}
        <div className="flex flex-col gap-4 border-b border-rule px-5 py-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="min-w-0 flex-1">
            <WorkOrderFlow workOrder={wo} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {wo.status === 'REQUESTED' && (
              <>
                <PermButton permission="workorder.approve" variant="danger" onClick={openReject}>
                  Rejeitar
                </PermButton>
                <PermButton permission="workorder.approve" onClick={() => { setActionError(''); setApproveOpen(true) }}>
                  Aprovar
                </PermButton>
              </>
            )}
            {wo.status === 'APPROVED' && (
              <PermButton permission="workorder.update" onClick={openSchedule}>
                Agendar
              </PermButton>
            )}
            {wo.status === 'SCHEDULED' && (
              <PermButton permission="workorder.update" onClick={() => { setActionError(''); setStartOpen(true) }}>
                Iniciar execução
              </PermButton>
            )}
            {wo.status === 'IN_PROGRESS' && (
              <PermButton permission="workorder.update" onClick={() => { setActionError(''); setCompleteOpen(true) }}>
                Concluir
              </PermButton>
            )}
            {canCancel && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" aria-label="Mais ações" className="px-2">
                    <Ellipsis className="size-4" aria-hidden="true" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 rounded-xs p-1">
                  <button
                    type="button"
                    disabled={!hasPermission('workorder.approve')}
                    title={hasPermission('workorder.approve') ? undefined : 'Você não tem permissão para esta ação'}
                    onClick={openCancel}
                    className="w-full rounded-xs px-2.5 py-2 text-left text-sm text-error hover:enabled:bg-error-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar OS
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <SheetSection title="Descrição">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">{wo.description}</p>
            </SheetSection>

            {wo.closingNotes && (
              <SheetSection title="Registro de conclusão">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">{wo.closingNotes}</p>
              </SheetSection>
            )}

            {/* Custos — só para quem tem cost.read (ver ADR 0001) */}
            {hasPermission('cost.read') && (
              <WorkOrderCostsSection workOrder={wo} canManage={hasPermission('cost.manage')} />
            )}
          </div>

          <aside className="border-t border-rule lg:border-t-0 lg:border-l" aria-label="Dados de referência">
            <SheetSection title="Ativo">
              <Link
                to={`/dashboard/assets/${wo.asset.id}`}
                className="block rounded-xs border border-rule-strong bg-subtle px-3 py-2.5 hover:border-primary hover:no-underline"
              >
                <span className="block font-mono text-base font-semibold text-ink">{wo.asset.tag}</span>
                <span className="block text-sm text-body">{wo.asset.name}</span>
                {wo.asset.location && <span className="block text-xs text-quiet">{wo.asset.location}</span>}
              </Link>
            </SheetSection>

            <SheetSection title="Responsáveis">
              <FactList
                items={[
                  { label: 'Solicitado por', value: wo.requestedBy.name },
                  { label: 'Técnico responsável', value: wo.assignedTo?.name ?? '—' },
                ]}
              />
            </SheetSection>

            <SheetSection title="Agenda">
              <FactList
                items={[
                  { label: 'Início previsto', value: <span className="font-mono tabular-nums">{formatDateTime(wo.scheduledStart)}</span> },
                  { label: 'Fim previsto', value: <span className="font-mono tabular-nums">{formatDateTime(wo.scheduledEnd)}</span> },
                  { label: 'Início real', value: <span className="font-mono tabular-nums">{formatDateTime(wo.startedAt)}</span> },
                  { label: 'Conclusão real', value: <span className="font-mono tabular-nums">{formatDateTime(wo.completedAt)}</span> },
                ]}
              />
            </SheetSection>

            <SheetSection title="Documento">
              <FactList
                items={[
                  { label: 'Emitida em', value: <span className="font-mono tabular-nums">{formatDateTime(wo.createdAt)}</span> },
                  { label: 'Atualizada em', value: <span className="font-mono tabular-nums">{formatDateTime(wo.updatedAt)}</span> },
                ]}
              />
            </SheetSection>
          </aside>
        </div>
      </Sheet>

      {/* Modais de ação */}
      <ApproveModal
        open={approveOpen}
        title={wo.title}
        loading={approving}
        error={actionError}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => approveWorkOrder()}
      />

      <RejectModal
        open={rejectOpen}
        loading={rejecting}
        error={actionError}
        reason={rejectReason}
        onReasonChange={(v) => { setRejectReason(v); setActionError('') }}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => rejectWorkOrder({ variables: { id: Number(id), input: { rejectionReason: rejectReason } } })}
      />

      <ScheduleModal
        open={scheduleOpen}
        loading={scheduling}
        error={actionError}
        users={users}
        form={scheduleForm}
        onAssigneeChange={(v) => { setScheduleForm((f) => ({ ...f, assignedToId: v })); setActionError('') }}
        onScheduledStartChange={(d) => { setScheduleForm((f) => ({ ...f, scheduledStart: d })); setActionError('') }}
        onScheduledEndChange={(d) => { setScheduleForm((f) => ({ ...f, scheduledEnd: d })); setActionError('') }}
        onClose={() => setScheduleOpen(false)}
        onConfirm={() =>
          scheduleWorkOrder({
            variables: {
              id: Number(id),
              input: {
                assignedToId: Number(scheduleForm.assignedToId),
                scheduledStart: scheduleForm.scheduledStart!.toISOString(),
                ...(scheduleForm.scheduledEnd ? { scheduledEnd: scheduleForm.scheduledEnd.toISOString() } : {}),
              },
            },
          })
        }
      />

      <StartModal
        open={startOpen}
        title={wo.title}
        loading={starting}
        error={actionError}
        onClose={() => setStartOpen(false)}
        onConfirm={() => startWorkOrder()}
      />

      <CompleteModal
        open={completeOpen}
        loading={completing}
        error={actionError}
        notes={closingNotes}
        laborHours={laborHours}
        onNotesChange={(v) => { setClosingNotes(v); setActionError('') }}
        onLaborHoursChange={(v) => { setLaborHours(v); setActionError('') }}
        onClose={() => setCompleteOpen(false)}
        onConfirm={() =>
          completeWorkOrder({
            variables: {
              id: Number(id),
              input: {
                closingNotes,
                ...(laborHours.trim() ? { laborHours: Number(laborHours) } : {}),
              },
            },
          })
        }
      />

      <CancelModal
        open={cancelOpen}
        loading={cancelling}
        error={actionError}
        reason={cancelReason}
        onReasonChange={(v) => { setCancelReason(v); setActionError('') }}
        onClose={() => setCancelOpen(false)}
        onConfirm={() =>
          cancelWorkOrder({
            variables: { id: Number(id), input: { cancellationReason: cancelReason } },
          })
        }
      />
    </>
  )
}
