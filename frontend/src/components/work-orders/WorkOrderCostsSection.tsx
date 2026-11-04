import { type ReactNode, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { format, parse } from 'date-fns'

import Button from '../ui/Button'
import { DatePicker } from '../ui/date-picker'
import { FormAlert, FormField, FormGrid } from '../ui/FormLayout'
import { Input } from '../ui/input'
import { MoneyInput } from '../ui/money-input'
import Modal from '../ui/Modal'
import { NativeSelect } from '../ui/select'
import { SheetSection } from '../ui/Sheet'
import Skeleton from '../ui/Skeleton'
import { GET_WORK_ORDER } from '../../graphql/work-orders/GetWorkOrder.gql'
import { GET_WORK_ORDER_PARTS } from '../../graphql/work-order-costs/GetWorkOrderParts.gql'
import { GET_SPARE_PARTS } from '../../graphql/spare-parts/GetSpareParts.gql'
import { ADD_WORK_ORDER_PART, REMOVE_WORK_ORDER_PART } from '../../graphql/spare-parts/AddWorkOrderPart.gql'
import type {
  AddWorkOrderPartData,
  GetSparePartsData,
  RemoveWorkOrderPartData,
  SparePart,
} from '../../graphql/spare-parts/types'
import { ADD_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/AddWorkOrderExternalCost.gql'
import { UPDATE_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/UpdateWorkOrderExternalCost.gql'
import { REMOVE_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/RemoveWorkOrderExternalCost.gql'
import type {
  AddWorkOrderExternalCostData,
  ExternalCostFormValues,
  GetWorkOrderPartsData,
  WorkOrderPartItem,
  RemoveWorkOrderExternalCostData,
  UpdateWorkOrderExternalCostData,
  WorkOrderExternalCost,
} from '../../graphql/work-order-costs/types'
import type { WorkOrderDetail, WorkOrderStatus } from '../../graphql/work-orders/types'
import { atLocalNoon, parseDayValue } from '../../lib/period'
import { cn, errorMessage } from '../../lib/utils'

// ── Helpers ────────────────────────────────────────────────
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function money(value: number | null | undefined): string {
  return value == null ? '—' : BRL.format(value)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(iso))
}

/** O formulário guarda o dia como `yyyy-MM-dd`, no calendário local. */
const DAY_FORMAT = 'yyyy-MM-dd'

const toDay = (date: Date) => format(date, DAY_FORMAT)
const fromDay = (day: string) => parse(day, DAY_FORMAT, new Date())

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
  if (!form.incurredAt) return 'Informe a data do serviço.'
  return null
}

// ── ConfirmRemoveModal ─────────────────────────────────────
interface ConfirmRemoveModalProps {
  readonly open: boolean
  readonly title: string
  readonly message: string
  readonly error: string
  readonly removing: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void
}

/** Remover peça ou serviço externo muda o custo da OS: sempre pede confirmação. */
function ConfirmRemoveModal({ open, title, message, error, removing, onClose, onConfirm }: ConfirmRemoveModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="link" onClick={onClose} disabled={removing}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={removing}>
            Remover
          </Button>
        </>
      }
    >
      <p className="text-sm text-body">{message}</p>
      {error && <FormAlert className="m-0 mt-3">{error}</FormAlert>}
    </Modal>
  )
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
          <Button variant="link" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} loading={saving}>
            {editing ? 'Salvar' : 'Lançar'}
          </Button>
        </>
      }
    >
      <FormGrid columns={2}>
        <FormField span="full">
          <Input
            id="ext-description"
            label="Descrição"
            required
            value={form.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Ex.: Retífica do motor principal"
            maxLength={300}
          />
        </FormField>
        <FormField span="full">
          <Input
            id="ext-supplier"
            label="Fornecedor (opcional)"
            value={form.supplier}
            onChange={(e) => onChange('supplier', e.target.value)}
            placeholder="Ex.: Retificadora Oeste"
            maxLength={200}
          />
        </FormField>
        <FormField>
          <MoneyInput
            id="ext-amount"
            label="Valor"
            required
            value={form.amount}
            onValueChange={(v) => onChange('amount', v)}
          />
        </FormField>
        <FormField>
          <DatePicker
            id="ext-incurredAt"
            label="Data do serviço"
            required
            value={form.incurredAt ? fromDay(form.incurredAt) : undefined}
            onSelect={(day) => onChange('incurredAt', day ? toDay(day) : '')}
            toDate={new Date()}
            hint="Entra no custo do mês desta data, não no da conclusão da OS."
          />
        </FormField>
      </FormGrid>
      {error && <FormAlert className="m-0 mt-3">{error}</FormAlert>}
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
  const [pendingCost, setPendingCost] = useState<WorkOrderExternalCost | null>(null)
  const [removeCostError, setRemoveCostError] = useState('')

  const refetchQueries = [{ query: GET_WORK_ORDER, variables: { id: workOrder.id } }]

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
    {
      refetchQueries,
      awaitRefetchQueries: true,
      onCompleted: () => setPendingCost(null),
      onError: (e) => setRemoveCostError(errorMessage(e)),
    },
  )

  function askRemoveCost(item: WorkOrderExternalCost) {
    setRemoveCostError('')
    setPendingCost(item)
  }

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
      incurredAt: toDay(workOrder.completedAt ? new Date(workOrder.completedAt) : new Date()),
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
      incurredAt: toDay(parseDayValue(cost.incurredAt)),
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
      incurredAt: atLocalNoon(fromDay(form.incurredAt)).toISOString(),
    }

    if (editing) {
      void updateCost({ variables: { id: editing.id, input: payload } })
    } else {
      void addCost({ variables: { input: { workOrderId: workOrder.id, ...payload } } })
    }
  }

  const externalCosts = workOrder.externalCosts ?? []
  const cost = workOrder.cost
  const saving = adding || updating

  return (
    <SheetSection
      title="Custos"
      aside={
        canManage && (
          <Button size="sm" variant="secondary" onClick={openCreate}>
            Lançar serviço externo
          </Button>
        )
      }
    >
      {!workOrder.costIsComplete && (
        <p
          className="mb-4 border-l-[3px] border-warning bg-warning-soft px-3 py-2 text-sm text-[var(--warning-text)]"
          role="status"
        >
          Custo incompleto: faltou preço de peça ou taxa horária. O total abaixo subestima o gasto real.
        </p>
      )}

      <div className="flex flex-col gap-5">
        <CostBlock title="Mão de obra">
          <dl className="flex flex-col">
            <Line label="Horas apontadas" value={workOrder.laborHours == null ? '—' : `${workOrder.laborHours} h`} />
            <Line label="Custo de mão de obra" value={money(cost?.laborCost)} />
          </dl>
        </CostBlock>

        <CostBlock title="Serviços externos">
          {externalCosts.length === 0 ? (
            <Empty>Nenhum lançamento.</Empty>
          ) : (
            <CostTable
              headers={['Descrição', 'Fornecedor', 'Data do serviço', 'Valor', ...(canManage ? [''] : [])]}
              numeric={[3]}
              rows={externalCosts.map((item) => ({
                key: item.id,
                cells: [
                  item.description,
                  item.supplier ?? '—',
                  <span className="font-mono tabular-nums">{formatDate(item.incurredAt)}</span>,
                  money(item.amount),
                  ...(canManage
                    ? [
                        <span className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-error"
                            aria-label={`Remover ${item.description}`}
                            onClick={() => askRemoveCost(item)}
                          >
                            Remover
                          </Button>
                        </span>,
                      ]
                    : []),
                ],
              }))}
            />
          )}
        </CostBlock>

        <dl className="ml-auto flex w-full max-w-xs flex-col border-t-2 border-ink pt-2">
          <Line label="Peças" value={money(cost?.partsCost)} />
          <Line label="Mão de obra" value={money(cost?.laborCost)} />
          <Line label="Serviços externos" value={money(cost?.externalCost)} />
          <Line label="Total" value={money(cost?.total)} strong />
        </dl>
      </div>

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

      <ConfirmRemoveModal
        open={pendingCost !== null}
        title="Remover serviço externo"
        message={
          pendingCost
            ? `Remover "${pendingCost.description}" (${money(pendingCost.amount)}) desta OS? O custo da OS será recalculado.`
            : ''
        }
        error={removeCostError}
        removing={removing}
        onClose={() => setPendingCost(null)}
        onConfirm={() => pendingCost && void removeCost({ variables: { id: pendingCost.id } })}
      />
    </SheetSection>
  )
}

// ── WorkOrderPartsSection ──────────────────────────────────
/** Peça só entra ou sai da OS entre a aprovação e a conclusão (regra do backend). */
const PARTS_EDITABLE_STATUSES: readonly WorkOrderStatus[] = ['APPROVED', 'SCHEDULED', 'IN_PROGRESS']

interface PartFormValues {
  readonly sparePartId: string
  readonly quantity: string
}

const EMPTY_PART_FORM: PartFormValues = { sparePartId: '', quantity: '1' }

function validatePart(form: PartFormValues, part: SparePart | undefined): string | null {
  if (!part) return 'Selecione a peça.'
  const quantity = Number(form.quantity)
  if (!Number.isInteger(quantity) || quantity < 1) return 'A quantidade deve ser um número inteiro maior que zero.'
  if (quantity > part.quantity) return `Quantidade maior que o estoque (${part.quantity} un.).`
  return null
}

interface AddPartModalProps {
  readonly open: boolean
  readonly options: readonly SparePart[]
  readonly loadingOptions: boolean
  readonly form: PartFormValues
  readonly error: string
  readonly saving: boolean
  readonly onChange: (field: keyof PartFormValues, value: string) => void
  readonly onClose: () => void
  readonly onConfirm: () => void
}

function AddPartModal({
  open,
  options,
  loadingOptions,
  form,
  error,
  saving,
  onChange,
  onClose,
  onConfirm,
}: AddPartModalProps) {
  const selected = options.find((p) => String(p.id) === form.sparePartId)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar peça"
      footer={
        <>
          <Button variant="link" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} loading={saving}>
            Adicionar
          </Button>
        </>
      }
    >
      <FormGrid columns={2}>
        <FormField span="full">
          <NativeSelect
            id="part-sparePartId"
            label="Peça"
            required
            disabled={loadingOptions}
            value={form.sparePartId}
            onChange={(e) => onChange('sparePartId', e.target.value)}
          >
            <option value="">{loadingOptions ? 'Carregando peças…' : 'Selecionar peça…'}</option>
            {options.map((p) => (
              <option key={p.id} value={String(p.id)} disabled={p.quantity < 1}>
                {p.name} ({p.partNumber}) — estoque: {p.quantity}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField>
          <Input
            id="part-quantity"
            label="Quantidade"
            required
            type="number"
            inputMode="numeric"
            min={1}
            max={selected?.quantity}
            step={1}
            value={form.quantity}
            onChange={(e) => onChange('quantity', e.target.value)}
            hint={selected ? `Em estoque: ${selected.quantity} un.` : undefined}
          />
        </FormField>
      </FormGrid>
      {!loadingOptions && options.length === 0 && (
        <p className="mt-3 text-sm text-faint">Todas as peças cadastradas já estão nesta OS.</p>
      )}
      {error && <FormAlert className="m-0 mt-3">{error}</FormAlert>}
    </Modal>
  )
}

interface WorkOrderPartsSectionProps {
  readonly workOrder: WorkOrderDetail
  /** Habilita adicionar e remover peças (permissão workorder.update). */
  readonly canEdit: boolean
  /** Exibe preço congelado e subtotal (permissão cost.read). */
  readonly showCost: boolean
}

export function WorkOrderPartsSection({ workOrder, canEdit, showCost }: WorkOrderPartsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PartFormValues>(EMPTY_PART_FORM)
  const [formError, setFormError] = useState('')
  const [removeError, setRemoveError] = useState('')
  const [pendingPart, setPendingPart] = useState<WorkOrderPartItem | null>(null)

  const editable = canEdit && PARTS_EDITABLE_STATUSES.includes(workOrder.status)

  const { data: partsData, loading: partsLoading } = useQuery<GetWorkOrderPartsData>(
    GET_WORK_ORDER_PARTS,
    { variables: { workOrderId: workOrder.id } },
  )

  const { data: sparePartsData, loading: sparePartsLoading } = useQuery<GetSparePartsData>(
    GET_SPARE_PARTS,
    { skip: !modalOpen, fetchPolicy: 'cache-and-network' },
  )

  const refetchQueries = [
    { query: GET_WORK_ORDER_PARTS, variables: { workOrderId: workOrder.id } },
    { query: GET_WORK_ORDER, variables: { id: workOrder.id } },
  ]

  const [addPart, { loading: adding }] = useMutation<AddWorkOrderPartData>(ADD_WORK_ORDER_PART, {
    refetchQueries,
    awaitRefetchQueries: true,
    onCompleted: closeModal,
    onError: (e) => setFormError(errorMessage(e)),
  })

  const [removePart, { loading: removing }] = useMutation<RemoveWorkOrderPartData>(REMOVE_WORK_ORDER_PART, {
    refetchQueries,
    awaitRefetchQueries: true,
    onCompleted: () => setPendingPart(null),
    onError: (e) => setRemoveError(errorMessage(e)),
  })

  const parts = partsData?.workOrderParts ?? []
  const usedIds = new Set(parts.map((p) => p.sparePartId))
  const options = (sparePartsData?.spareParts ?? []).filter((p) => !usedIds.has(p.id))

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_PART_FORM)
    setFormError('')
  }

  function openModal() {
    setForm(EMPTY_PART_FORM)
    setFormError('')
    setRemoveError('')
    setModalOpen(true)
  }

  function handleChange(field: keyof PartFormValues, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (formError) setFormError('')
  }

  function handleConfirm() {
    const part = options.find((p) => String(p.id) === form.sparePartId)
    const message = validatePart(form, part)
    if (message) {
      setFormError(message)
      return
    }
    void addPart({
      variables: {
        input: { workOrderId: workOrder.id, sparePartId: Number(form.sparePartId), quantityUsed: Number(form.quantity) },
      },
    })
  }

  function askRemove(part: WorkOrderPartItem) {
    setRemoveError('')
    setPendingPart(part)
  }

  const headers = [
    'Peça',
    'Código',
    'Qtd.',
    ...(showCost ? ['Preço congelado', 'Subtotal'] : []),
    ...(editable ? [''] : []),
  ]

  return (
    <SheetSection
      title="Peças utilizadas"
      aside={
        editable && (
          <Button size="sm" variant="secondary" onClick={openModal}>
            Adicionar peça
          </Button>
        )
      }
    >
      {partsLoading ? (
        <div className="flex flex-col gap-2 py-2">
          <Skeleton className="w-2/3" />
          <Skeleton className="w-1/2" />
        </div>
      ) : parts.length === 0 ? (
        <Empty>Nenhuma peça utilizada.</Empty>
      ) : (
        <CostTable
          headers={headers}
          numeric={showCost ? [2, 3, 4] : [2]}
          rows={parts.map((part) => ({
            key: part.id,
            cells: [
              part.sparePart.name,
              <span className="font-mono">{part.sparePart.partNumber}</span>,
              part.quantityUsed,
              ...(showCost
                ? [
                    money(part.unitCostSnapshot),
                    part.unitCostSnapshot == null ? '—' : money(part.unitCostSnapshot * part.quantityUsed),
                  ]
                : []),
              ...(editable
                ? [
                    <span className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-error"
                        aria-label={`Remover ${part.sparePart.name}`}
                        onClick={() => askRemove(part)}
                      >
                        Remover
                      </Button>
                    </span>,
                  ]
                : []),
            ],
          }))}
        />
      )}

      <AddPartModal
        open={modalOpen}
        options={options}
        loadingOptions={sparePartsLoading && !sparePartsData}
        form={form}
        error={formError}
        saving={adding}
        onChange={handleChange}
        onClose={closeModal}
        onConfirm={handleConfirm}
      />

      <ConfirmRemoveModal
        open={pendingPart !== null}
        title="Remover peça"
        message={
          pendingPart
            ? `Remover ${pendingPart.sparePart.name} (${pendingPart.quantityUsed} un.) desta OS?`
            : ''
        }
        error={removeError}
        removing={removing}
        onClose={() => setPendingPart(null)}
        onConfirm={() =>
          pendingPart && void removePart({ variables: { workOrderId: workOrder.id, sparePartId: pendingPart.sparePartId } })
        }
      />
    </SheetSection>
  )
}

// ── Peças de apresentação ──────────────────────────────────
function CostBlock({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium text-quiet">{title}</h3>
      {children}
    </div>
  )
}

function Empty({ children }: { readonly children: ReactNode }) {
  return <p className="py-1 text-sm text-faint">{children}</p>
}

function Line({ label, value, strong = false }: { readonly label: string; readonly value: string; readonly strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4 py-1 text-sm', strong ? 'font-semibold text-ink' : 'text-body')}>
      <dt>{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  )
}

interface CostTableProps {
  readonly headers: readonly string[]
  /** Índices das colunas numéricas (alinhadas à direita, em Mono). */
  readonly numeric: readonly number[]
  readonly rows: readonly { readonly key: number; readonly cells: readonly ReactNode[] }[]
}

function CostTable({ headers, numeric, rows }: CostTableProps) {
  const align = (i: number) => (numeric.includes(i) ? 'text-right font-mono tabular-nums' : 'text-left')
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={`${h}-${i}`}
                scope="col"
                className={cn('border-b border-rule bg-subtle px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-quiet', align(i))}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-rule">
              {row.cells.map((cell, i) => (
                <td key={i} className={cn('px-2.5 py-1.5 text-ink', align(i))}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
