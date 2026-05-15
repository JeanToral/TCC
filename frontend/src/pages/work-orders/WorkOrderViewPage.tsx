import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { DateTimePicker } from '../../components/ui/date-time-picker'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
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
  Priority,
  RejectWorkOrderData,
  ScheduleWorkOrderData,
  StartWorkOrderData,
  WorkOrderStatus,
} from '../../graphql/work-orders/types'
import './WorkOrderViewPage.css'

// ── Helpers ────────────────────────────────────────────────
const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

const STATUS_VARIANT: Record<WorkOrderStatus, BadgeVariant> = {
  REQUESTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  SCHEDULED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
}

const PRIORITY_VARIANT: Record<Priority, BadgeVariant> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
}

const PRIORITY_BORDER: Record<Priority, string> = {
  LOW: '',
  MEDIUM: 'wo-view-page__priority--medium',
  HIGH: 'wo-view-page__priority--high',
  CRITICAL: 'wo-view-page__priority--critical',
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

// ── ApproveModal ───────────────────────────────────────────
function ApproveModal({
  open,
  title,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  readonly open: boolean
  readonly title: string
  readonly loading: boolean
  readonly error: string
  readonly onClose: () => void
  readonly onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aprovar ordem de serviço"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={onConfirm}>
            Confirmar aprovação
          </Button>
        </>
      }
    >
      <p className="wo-view-page__modal-msg">
        Confirmar aprovação da OS <strong>{title}</strong>?
      </p>
      {error && <p className="wo-view-page__modal-error">{error}</p>}
    </Modal>
  )
}

// ── RejectModal ────────────────────────────────────────────
function RejectModal({
  open,
  loading,
  error,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  readonly open: boolean
  readonly loading: boolean
  readonly error: string
  readonly reason: string
  readonly onReasonChange: (v: string) => void
  readonly onClose: () => void
  readonly onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rejeitar ordem de serviço"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm} disabled={!reason.trim()}>
            Confirmar rejeição
          </Button>
        </>
      }
    >
      <div className="wo-view-page__field">
        <label className="wo-view-page__label" htmlFor="reject-reason">
          Motivo da rejeição <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="reject-reason"
          className="wo-view-page__textarea"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          placeholder="Descreva o motivo da rejeição…"
          maxLength={1000}
        />
      </div>
      {error && <p className="wo-view-page__modal-error">{error}</p>}
    </Modal>
  )
}

// ── ScheduleModal ──────────────────────────────────────────
function ScheduleModal({
  open,
  loading,
  error,
  users,
  form,
  onAssigneeChange,
  onScheduledStartChange,
  onScheduledEndChange,
  onClose,
  onConfirm,
}: {
  readonly open: boolean
  readonly loading: boolean
  readonly error: string
  readonly users: readonly { id: number; name: string }[]
  readonly form: { assignedToId: string; scheduledStart: Date | undefined; scheduledEnd: Date | undefined }
  readonly onAssigneeChange: (value: string) => void
  readonly onScheduledStartChange: (date: Date | undefined) => void
  readonly onScheduledEndChange: (date: Date | undefined) => void
  readonly onClose: () => void
  readonly onConfirm: () => void
}) {
  const canConfirm = !!form.assignedToId && !!form.scheduledStart

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agendar ordem de serviço"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={onConfirm} disabled={!canConfirm}>
            Confirmar agendamento
          </Button>
        </>
      }
    >
      <div className="wo-view-page__form">
        <div className="wo-view-page__field">
          <label className="wo-view-page__label" htmlFor="sched-assignee">
            Técnico responsável <span aria-hidden="true">*</span>
          </label>
          <select
            id="sched-assignee"
            className="wo-view-page__select"
            value={form.assignedToId}
            onChange={(e) => onAssigneeChange(e.target.value)}
          >
            <option value="">Selecionar técnico…</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <DateTimePicker
          label="Início previsto"
          value={form.scheduledStart}
          onSelect={onScheduledStartChange}
          required
        />
        <DateTimePicker
          label="Fim previsto"
          value={form.scheduledEnd}
          onSelect={onScheduledEndChange}
          placeholder="Selecionar data e hora (opcional)"
        />
      </div>
      {error && <p className="wo-view-page__modal-error">{error}</p>}
    </Modal>
  )
}

// ── StartModal ─────────────────────────────────────────────
function StartModal({
  open,
  title,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  readonly open: boolean
  readonly title: string
  readonly loading: boolean
  readonly error: string
  readonly onClose: () => void
  readonly onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Iniciar ordem de serviço"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={onConfirm}>
            Confirmar início
          </Button>
        </>
      }
    >
      <p className="wo-view-page__modal-msg">
        Confirmar início da OS <strong>{title}</strong>?
      </p>
      {error && <p className="wo-view-page__modal-error">{error}</p>}
    </Modal>
  )
}

// ── CompleteModal ──────────────────────────────────────────
function CompleteModal({
  open,
  loading,
  error,
  notes,
  onNotesChange,
  onClose,
  onConfirm,
}: {
  readonly open: boolean
  readonly loading: boolean
  readonly error: string
  readonly notes: string
  readonly onNotesChange: (v: string) => void
  readonly onClose: () => void
  readonly onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Concluir ordem de serviço"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={onConfirm} disabled={!notes.trim()}>
            Confirmar conclusão
          </Button>
        </>
      }
    >
      <div className="wo-view-page__field">
        <label className="wo-view-page__label" htmlFor="closing-notes">
          Notas de conclusão <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="closing-notes"
          className="wo-view-page__textarea"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          placeholder="Descreva o que foi feito…"
          maxLength={2000}
        />
      </div>
      {error && <p className="wo-view-page__modal-error">{error}</p>}
    </Modal>
  )
}

// ── CancelModal ────────────────────────────────────────────
function CancelModal({
  open,
  loading,
  error,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  readonly open: boolean
  readonly loading: boolean
  readonly error: string
  readonly reason: string
  readonly onReasonChange: (v: string) => void
  readonly onClose: () => void
  readonly onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelar ordem de serviço"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm} disabled={!reason.trim()}>
            Confirmar cancelamento
          </Button>
        </>
      }
    >
      <div className="wo-view-page__field">
        <label className="wo-view-page__label" htmlFor="cancel-reason">
          Motivo do cancelamento <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="cancel-reason"
          className="wo-view-page__textarea"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          placeholder="Descreva o motivo do cancelamento…"
          maxLength={1000}
        />
      </div>
      {error && <p className="wo-view-page__modal-error">{error}</p>}
    </Modal>
  )
}

// ── Page ───────────────────────────────────────────────────
export default function WorkOrderViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [scheduleForm, setScheduleForm] = useState<{
    assignedToId: string
    scheduledStart: Date | undefined
    scheduledEnd: Date | undefined
  }>({ assignedToId: '', scheduledStart: undefined, scheduledEnd: undefined })
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
    onError: (e) => setActionError(e.graphQLErrors[0]?.message ?? e.message),
  })

  const [rejectWorkOrder, { loading: rejecting }] = useMutation<RejectWorkOrderData>(REJECT_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => { setRejectOpen(false); setRejectReason('') },
    onError: (e) => setActionError(e.graphQLErrors[0]?.message ?? e.message),
  })

  const [scheduleWorkOrder, { loading: scheduling }] = useMutation<ScheduleWorkOrderData>(SCHEDULE_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => { setScheduleOpen(false); setScheduleForm({ assignedToId: '', scheduledStart: undefined, scheduledEnd: undefined }) },
    onError: (e) => setActionError(e.graphQLErrors[0]?.message ?? e.message),
  })

  const [startWorkOrder, { loading: starting }] = useMutation<StartWorkOrderData>(START_WORK_ORDER, {
    variables: { id: Number(id) },
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => setStartOpen(false),
    onError: (e) => setActionError(e.graphQLErrors[0]?.message ?? e.message),
  })

  const [completeWorkOrder, { loading: completing }] = useMutation<CompleteWorkOrderData>(COMPLETE_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => { setCompleteOpen(false); setClosingNotes('') },
    onError: (e) => setActionError(e.graphQLErrors[0]?.message ?? e.message),
  })

  const [cancelWorkOrder, { loading: cancelling }] = useMutation<CancelWorkOrderData>(CANCEL_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDER, variables: { id: Number(id) } }, ...refetchList],
    onCompleted: () => { setCancelOpen(false); setCancelReason('') },
    onError: (e) => setActionError(e.graphQLErrors[0]?.message ?? e.message),
  })

  if (loading) {
    return <div className="page-loading"><Spinner size="lg" /></div>
  }

  if (error || !data?.workOrder) {
    return (
      <div className="wo-view-page">
        <div className="page-error" role="alert">
          {error ? `Erro: ${error.message}` : 'Ordem de serviço não encontrada.'}
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard/work-orders')} className="wo-view-page__back-btn">
          ← Voltar para lista
        </Button>
      </div>
    )
  }

  const wo = data.workOrder

  function openReject() { setActionError(''); setRejectReason(''); setRejectOpen(true) }
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
    <div className={`wo-view-page ${PRIORITY_BORDER[wo.priority]}`}>
      {/* Header */}
      <header className="page-header">
        <div className="page-header__info">
          <button type="button" className="wo-view-page__back" onClick={() => navigate('/dashboard/work-orders')}>
            ← Ordens de Serviço
          </button>
          <h1 className="page-header__title">{wo.title}</h1>
          <Badge variant={STATUS_VARIANT[wo.status]}>{STATUS_LABELS[wo.status]}</Badge>
        </div>
        <div className="page-header__actions">
          {wo.status === 'REQUESTED' && (
            <>
              <Button onClick={() => { setActionError(''); setApproveOpen(true) }}>
                Aprovar
              </Button>
              <Button variant="danger" onClick={openReject}>
                Rejeitar
              </Button>
            </>
          )}
          {wo.status === 'APPROVED' && (
            <Button onClick={openSchedule}>
              Agendar
            </Button>
          )}
          {wo.status === 'SCHEDULED' && (
            <Button onClick={() => { setActionError(''); setStartOpen(true) }}>
              Iniciar
            </Button>
          )}
          {wo.status === 'IN_PROGRESS' && (
            <Button onClick={() => { setActionError(''); setCompleteOpen(true) }}>
              Concluir
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={() => { setActionError(''); setCancelReason(''); setCancelOpen(true) }}>
              Cancelar
            </Button>
          )}
        </div>
      </header>

      {/* Cards */}
      <div className="wo-view-page__grid">
        {/* Detalhes */}
        <div className="detail-card wo-view-page__card--wide">
          <h2 className="detail-card__title">Detalhes</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Descrição</dt>
              <dd className="detail-list__value wo-view-page__description">{wo.description}</dd>
            </div>
            <div className="wo-view-page__row">
              <div className="detail-list__item">
                <dt className="detail-list__label">Tipo</dt>
                <dd className="detail-list__value">{wo.type === 'CORRECTIVE' ? 'Corretiva' : 'Preventiva'}</dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Prioridade</dt>
                <dd className="detail-list__value">
                  <Badge variant={PRIORITY_VARIANT[wo.priority]}>{PRIORITY_LABELS[wo.priority]}</Badge>
                </dd>
              </div>
            </div>
            {wo.rejectionReason && (
              <div className="detail-list__item">
                <dt className="detail-list__label">Motivo da rejeição</dt>
                <dd className="detail-list__value wo-view-page__rejection">{wo.rejectionReason}</dd>
              </div>
            )}
            {wo.cancellationReason && (
              <div className="detail-list__item">
                <dt className="detail-list__label">Motivo do cancelamento</dt>
                <dd className="detail-list__value wo-view-page__rejection">{wo.cancellationReason}</dd>
              </div>
            )}
            {wo.closingNotes && (
              <div className="detail-list__item">
                <dt className="detail-list__label">Notas de conclusão</dt>
                <dd className="detail-list__value wo-view-page__description">{wo.closingNotes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Ativo */}
        <div className="detail-card">
          <h2 className="detail-card__title">Ativo</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Tag</dt>
              <dd className="detail-list__value wo-view-page__tag">{wo.asset.tag}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Nome</dt>
              <dd className="detail-list__value">{wo.asset.name}</dd>
            </div>
            {wo.asset.location && (
              <div className="detail-list__item">
                <dt className="detail-list__label">Localização</dt>
                <dd className="detail-list__value">{wo.asset.location}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Responsáveis */}
        <div className="detail-card">
          <h2 className="detail-card__title">Responsáveis</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Solicitado por</dt>
              <dd className="detail-list__value">{wo.requestedBy.name}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Técnico responsável</dt>
              <dd className="detail-list__value">{wo.assignedTo?.name ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Agendamento */}
        <div className="detail-card">
          <h2 className="detail-card__title">Agendamento</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Início previsto</dt>
              <dd className="detail-list__value">{formatDateTime(wo.scheduledStart)}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Fim previsto</dt>
              <dd className="detail-list__value">{formatDateTime(wo.scheduledEnd)}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Início real</dt>
              <dd className="detail-list__value">{formatDateTime(wo.startedAt)}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Conclusão real</dt>
              <dd className="detail-list__value">{formatDateTime(wo.completedAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Metadados */}
        <div className="detail-card">
          <h2 className="detail-card__title">Metadados</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Criado em</dt>
              <dd className="detail-list__value">{formatDateTime(wo.createdAt)}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Atualizado em</dt>
              <dd className="detail-list__value">{formatDateTime(wo.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Modals */}
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
        onNotesChange={(v) => { setClosingNotes(v); setActionError('') }}
        onClose={() => setCompleteOpen(false)}
        onConfirm={() =>
          completeWorkOrder({
            variables: { id: Number(id), input: { closingNotes } },
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
    </div>
  )
}
