import type { ReactNode } from 'react'

import Button from '../ui/Button'
import { DateTimePicker } from '../ui/date-time-picker'
import { FormAlert, FormField, FormGrid } from '../ui/FormLayout'
import { Input } from '../ui/input'
import Modal from '../ui/Modal'
import { NativeSelect } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { defaultScheduleEnd, defaultScheduleStart, validateSchedule } from '../../lib/period'

interface ActionModalProps {
  readonly open: boolean
  readonly loading: boolean
  readonly error: string
  readonly onClose: () => void
  readonly onConfirm: () => void
}

function ModalError({ error }: { readonly error: string }) {
  return error ? <FormAlert className="m-0 mt-3">{error}</FormAlert> : null
}

function Footer({
  dismiss = 'Cancelar',
  confirm,
  variant = 'primary',
  loading,
  disabled,
  onClose,
  onConfirm,
}: {
  readonly dismiss?: string
  readonly confirm: string
  readonly variant?: 'primary' | 'danger'
  readonly loading: boolean
  readonly disabled?: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void
}) {
  return (
    <>
      <Button variant="link" onClick={onClose} disabled={loading}>
        {dismiss}
      </Button>
      <Button variant={variant} loading={loading} onClick={onConfirm} disabled={disabled}>
        {confirm}
      </Button>
    </>
  )
}

function ConfirmMessage({ children }: { readonly children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-body">{children}</p>
}

// ── Aprovar ────────────────────────────────────────────────
export function ApproveModal({ title, ...props }: ActionModalProps & { readonly title: string }) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Aprovar ordem de serviço"
      size="sm"
      footer={<Footer confirm="Confirmar aprovação" {...props} />}
    >
      <ConfirmMessage>
        Confirmar aprovação da OS <strong>{title}</strong>?
      </ConfirmMessage>
      <ModalError error={props.error} />
    </Modal>
  )
}

// ── Rejeitar ───────────────────────────────────────────────
export function RejectModal({
  reason,
  onReasonChange,
  ...props
}: ActionModalProps & { readonly reason: string; readonly onReasonChange: (v: string) => void }) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Rejeitar ordem de serviço"
      size="sm"
      footer={<Footer confirm="Confirmar rejeição" variant="danger" disabled={!reason.trim()} {...props} />}
    >
      <FormGrid columns={1}>
        <FormField>
          <Textarea
            id="reject-reason"
            label="Motivo da rejeição"
            required
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            placeholder="Descreva o motivo da rejeição…"
            maxLength={1000}
          />
        </FormField>
      </FormGrid>
      <ModalError error={props.error} />
    </Modal>
  )
}

// ── Agendar ────────────────────────────────────────────────
export interface ScheduleForm {
  readonly assignedToId: string
  readonly scheduledStart: Date | undefined
  readonly scheduledEnd: Date | undefined
}

export function ScheduleModal({
  users,
  form,
  onAssigneeChange,
  onScheduledStartChange,
  onScheduledEndChange,
  ...props
}: ActionModalProps & {
  readonly users: readonly { readonly id: number; readonly name: string }[]
  readonly form: ScheduleForm
  readonly onAssigneeChange: (value: string) => void
  readonly onScheduledStartChange: (date: Date | undefined) => void
  readonly onScheduledEndChange: (date: Date | undefined) => void
}) {
  const errors = validateSchedule(form.scheduledStart, form.scheduledEnd)
  const canConfirm = !!form.assignedToId && !!form.scheduledStart && !errors.start && !errors.end

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Agendar ordem de serviço"
      footer={<Footer confirm="Confirmar agendamento" disabled={!canConfirm} {...props} />}
    >
      <FormGrid columns={2}>
        <FormField span="full">
          <NativeSelect
            id="sched-assignee"
            label="Técnico responsável"
            required
            value={form.assignedToId}
            onChange={(e) => onAssigneeChange(e.target.value)}
          >
            <option value="">Selecionar técnico…</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField>
          <DateTimePicker
            label="Início previsto"
            value={form.scheduledStart}
            onSelect={onScheduledStartChange}
            fromDate={new Date()}
            defaultTime={(day) => defaultScheduleStart(day)}
            error={errors.start}
            required
          />
        </FormField>
        <FormField>
          <DateTimePicker
            label="Fim previsto"
            value={form.scheduledEnd}
            onSelect={onScheduledEndChange}
            fromDate={form.scheduledStart ?? new Date()}
            defaultTime={(day) => defaultScheduleEnd(day, form.scheduledStart)}
            error={errors.end}
            placeholder="Opcional"
          />
        </FormField>
      </FormGrid>
      <ModalError error={props.error} />
    </Modal>
  )
}

// ── Iniciar ────────────────────────────────────────────────
export function StartModal({ title, ...props }: ActionModalProps & { readonly title: string }) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Iniciar execução"
      size="sm"
      footer={<Footer confirm="Confirmar início" {...props} />}
    >
      <ConfirmMessage>
        Confirmar início da OS <strong>{title}</strong>? O horário de início é registrado agora.
      </ConfirmMessage>
      <ModalError error={props.error} />
    </Modal>
  )
}

// ── Concluir ───────────────────────────────────────────────
export function CompleteModal({
  notes,
  laborHours,
  onNotesChange,
  onLaborHoursChange,
  ...props
}: ActionModalProps & {
  readonly notes: string
  readonly laborHours: string
  readonly onNotesChange: (v: string) => void
  readonly onLaborHoursChange: (v: string) => void
}) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Concluir ordem de serviço"
      size="sm"
      footer={<Footer confirm="Confirmar conclusão" disabled={!notes.trim()} {...props} />}
    >
      <FormGrid columns={1}>
        <FormField>
          <Textarea
            id="closing-notes"
            label="Notas de conclusão"
            required
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
            placeholder="Descreva o que foi feito…"
            maxLength={2000}
          />
        </FormField>
        <FormField>
          <Input
            id="labor-hours"
            label="Horas trabalhadas"
            type="number"
            min={0}
            max={999}
            step={0.5}
            value={laborHours}
            onChange={(e) => onLaborHoursChange(e.target.value)}
            placeholder="Ex.: 3"
            hint="Horas efetivamente trabalhadas, não o tempo total de parada."
          />
        </FormField>
      </FormGrid>
      <ModalError error={props.error} />
    </Modal>
  )
}

// ── Cancelar ───────────────────────────────────────────────
export function CancelModal({
  reason,
  onReasonChange,
  ...props
}: ActionModalProps & { readonly reason: string; readonly onReasonChange: (v: string) => void }) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Cancelar ordem de serviço"
      size="sm"
      footer={
        <Footer
          dismiss="Voltar"
          confirm="Confirmar cancelamento"
          variant="danger"
          disabled={!reason.trim()}
          {...props}
        />
      }
    >
      <FormGrid columns={1}>
        <FormField>
          <Textarea
            id="cancel-reason"
            label="Motivo do cancelamento"
            required
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            placeholder="Descreva o motivo do cancelamento…"
            maxLength={1000}
          />
        </FormField>
      </FormGrid>
      <ModalError error={props.error} />
    </Modal>
  )
}
