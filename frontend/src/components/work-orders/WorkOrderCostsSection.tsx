import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'

import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { Input } from '../ui/input'
import { GET_WORK_ORDER } from '../../graphql/work-orders/GetWorkOrder.gql'
import { GET_WORK_ORDER_PARTS } from '../../graphql/work-order-costs/GetWorkOrderParts.gql'
import { ADD_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/AddWorkOrderExternalCost.gql'
import { UPDATE_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/UpdateWorkOrderExternalCost.gql'
import { REMOVE_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/RemoveWorkOrderExternalCost.gql'
import type {
  AddWorkOrderExternalCostData,
  ExternalCostFormValues,
  GetWorkOrderPartsData,
  RemoveWorkOrderExternalCostData,
  UpdateWorkOrderExternalCostData,
  WorkOrderExternalCost,
} from '../../graphql/work-order-costs/types'
import type { WorkOrderDetail } from '../../graphql/work-orders/types'
import './WorkOrderCostsSection.css'

// ── Helpers ────────────────────────────────────────────────
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function money(value: number | null | undefined): string {
  return value == null ? '—' : BRL.format(value)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(iso))
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10)
}

const EMPTY_FORM: ExternalCostFormValues = {
  description: '',
  supplier: '',
  amount: '',
  incurredAt: '',
}

function validate(form: ExternalCostFormValues): string | null {
  if (!form.description.trim()) return 'Descrição é obrigatória.'
  const amount = Number(form.amount.replace(',', '.'))
  if (!form.amount.trim() || Number.isNaN(amount)) return 'Informe um valor válido.'
  if (amount <= 0) return 'O valor deve ser maior que zero.'
  if (!form.incurredAt) return 'A data de competência é obrigatória.'
  return null
}

// ── ExternalCostModal ──────────────────────────────────────
interface ExternalCostModalProps {
  readonly open: boolean
  readonly editing: WorkOrderExternalCost | null
  readonly form: ExternalCostFormValues
  readonly error: string
  readonly saving: boolean
  readonly onChange: (field: keyof ExternalCostFormValues, value: string) => void
  readonly onClose: () => void
  readonly onConfirm: () => void
}

function ExternalCostModal({
  open,
  editing,
  form,
  error,
  saving,
  onChange,
  onClose,
  onConfirm,
}: ExternalCostModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar lançamento' : 'Lançar serviço externo'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} loading={saving}>
            {editing ? 'Salvar' : 'Lançar'}
          </Button>
        </>
      }
    >
      <div className="wo-costs__form">
        <Input
          id="ext-description"
          label="Descrição"
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Ex.: Retífica do motor principal"
          maxLength={300}
        />
        <Input
          id="ext-supplier"
          label="Fornecedor (opcional)"
          value={form.supplier}
          onChange={(e) => onChange('supplier', e.target.value)}
          placeholder="Ex.: Retificadora Oeste"
          maxLength={200}
        />
        <Input
          id="ext-amount"
          label="Valor (R$)"
          type="number"
          min={0}
          step={0.01}
          value={form.amount}
          onChange={(e) => onChange('amount', e.target.value)}
          placeholder="0,00"
        />
        <Input
          id="ext-incurredAt"
          label="Competência"
          type="date"
          value={form.incurredAt}
          onChange={(e) => onChange('incurredAt', e.target.value)}
          hint="Mês a que o custo pertence — pode ser anterior ao lançamento."
        />
        {error && (
          <p className="wo-costs__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

// ── WorkOrderCostsSection ──────────────────────────────────
interface WorkOrderCostsSectionProps {
  readonly workOrder: WorkOrderDetail
  /** Habilita lançar, editar e remover serviço externo (permissão cost.manage). */
  readonly canManage: boolean
}

export default function WorkOrderCostsSection({
  workOrder,
  canManage,
}: WorkOrderCostsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkOrderExternalCost | null>(null)
  const [form, setForm] = useState<ExternalCostFormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const { data: partsData, loading: partsLoading } = useQuery<GetWorkOrderPartsData>(
    GET_WORK_ORDER_PARTS,
    { variables: { workOrderId: workOrder.id } },
  )

  const refetchQueries = [
    { query: GET_WORK_ORDER, variables: { id: workOrder.id } },
    { query: GET_WORK_ORDER_PARTS, variables: { workOrderId: workOrder.id } },
  ]

  const onMutationError = (e: { message: string }) => setFormError(e.message)

  const [addCost, { loading: adding }] = useMutation<AddWorkOrderExternalCostData>(
    ADD_WORK_ORDER_EXTERNAL_COST,
    { refetchQueries, onCompleted: closeModal, onError: onMutationError },
  )

  const [updateCost, { loading: updating }] = useMutation<UpdateWorkOrderExternalCostData>(
    UPDATE_WORK_ORDER_EXTERNAL_COST,
    { refetchQueries, onCompleted: closeModal, onError: onMutationError },
  )

  const [removeCost, { loading: removing }] = useMutation<RemoveWorkOrderExternalCostData>(
    REMOVE_WORK_ORDER_EXTERNAL_COST,
    { refetchQueries, onError: onMutationError },
  )

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function openCreate() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      incurredAt: toDateInput(workOrder.completedAt ?? new Date().toISOString()),
    })
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(cost: WorkOrderExternalCost) {
    setEditing(cost)
    setForm({
      description: cost.description,
      supplier: cost.supplier ?? '',
      amount: String(cost.amount),
      incurredAt: toDateInput(cost.incurredAt),
    })
    setFormError('')
    setModalOpen(true)
  }

  function handleChange(field: keyof ExternalCostFormValues, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (formError) setFormError('')
  }

  function handleConfirm() {
    const message = validate(form)
    if (message) {
      setFormError(message)
      return
    }

    const payload = {
      description: form.description.trim(),
      supplier: form.supplier.trim() || undefined,
      amount: Number(form.amount.replace(',', '.')),
      incurredAt: new Date(`${form.incurredAt}T00:00:00.000Z`).toISOString(),
    }

    if (editing) {
      void updateCost({ variables: { id: editing.id, input: payload } })
    } else {
      void addCost({ variables: { input: { workOrderId: workOrder.id, ...payload } } })
    }
  }

  const parts = partsData?.workOrderParts ?? []
  const externalCosts = workOrder.externalCosts ?? []
  const cost = workOrder.cost
  const saving = adding || updating

  return (
    <section className="detail-card wo-costs">
      <div className="wo-costs__header">
        <h2 className="detail-card__title">Custos</h2>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={openCreate}>
            Lançar serviço externo
          </Button>
        )}
      </div>

      {!workOrder.costIsComplete && (
        <p className="wo-costs__warning" role="status">
          Custo incompleto: faltou preço de peça ou taxa horária. O total abaixo
          subestima o gasto real.
        </p>
      )}

      {/* ── Peças ─────────────────────────────────────── */}
      <h3 className="wo-costs__subtitle">Peças</h3>
      {partsLoading ? (
        <div className="wo-costs__loading">
          <Spinner size="sm" />
        </div>
      ) : parts.length === 0 ? (
        <p className="wo-costs__empty">Nenhuma peça utilizada.</p>
      ) : (
        <table className="wo-costs__table">
          <thead>
            <tr>
              <th>Peça</th>
              <th>Código</th>
              <th className="wo-costs__num">Qtd.</th>
              <th className="wo-costs__num">Preço congelado</th>
              <th className="wo-costs__num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id}>
                <td>{part.sparePart.name}</td>
                <td>{part.sparePart.partNumber}</td>
                <td className="wo-costs__num">{part.quantityUsed}</td>
                <td className="wo-costs__num">{money(part.unitCostSnapshot)}</td>
                <td className="wo-costs__num">
                  {part.unitCostSnapshot == null
                    ? '—'
                    : money(part.unitCostSnapshot * part.quantityUsed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Mão de obra ───────────────────────────────── */}
      <h3 className="wo-costs__subtitle">Mão de obra</h3>
      <dl className="wo-costs__list">
        <div className="wo-costs__row">
          <dt>Horas apontadas</dt>
          <dd>{workOrder.laborHours == null ? '—' : `${workOrder.laborHours} h`}</dd>
        </div>
        <div className="wo-costs__row">
          <dt>Custo de mão de obra</dt>
          <dd>{money(cost?.laborCost)}</dd>
        </div>
      </dl>

      {/* ── Serviços externos ─────────────────────────── */}
      <h3 className="wo-costs__subtitle">Serviços externos</h3>
      {externalCosts.length === 0 ? (
        <p className="wo-costs__empty">Nenhum lançamento.</p>
      ) : (
        <table className="wo-costs__table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Fornecedor</th>
              <th>Competência</th>
              <th className="wo-costs__num">Valor</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {externalCosts.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.supplier ?? '—'}</td>
                <td>{formatDate(item.incurredAt)}</td>
                <td className="wo-costs__num">{money(item.amount)}</td>
                {canManage && (
                  <td className="wo-costs__actions">
                    <button type="button" onClick={() => openEdit(item)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="wo-costs__remove"
                      disabled={removing}
                      onClick={() => void removeCost({ variables: { id: item.id } })}
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Totais ────────────────────────────────────── */}
      <dl className="wo-costs__list wo-costs__list--totals">
        <div className="wo-costs__row">
          <dt>Peças</dt>
          <dd>{money(cost?.partsCost)}</dd>
        </div>
        <div className="wo-costs__row">
          <dt>Mão de obra</dt>
          <dd>{money(cost?.laborCost)}</dd>
        </div>
        <div className="wo-costs__row">
          <dt>Serviços externos</dt>
          <dd>{money(cost?.externalCost)}</dd>
        </div>
        <div className="wo-costs__row wo-costs__row--total">
          <dt>Total</dt>
          <dd>{money(cost?.total)}</dd>
        </div>
      </dl>

      <ExternalCostModal
        open={modalOpen}
        editing={editing}
        form={form}
        error={formError}
        saving={saving}
        onChange={handleChange}
        onClose={closeModal}
        onConfirm={handleConfirm}
      />
    </section>
  )
}
