import { type FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import { usePageCrumb } from '../../components/layout/Breadcrumbs'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/checkbox'
import {
  FormActions,
  FormAlert,
  FormField,
  FormGrid,
  FormLayout,
  FormSection,
} from '../../components/ui/FormLayout'
import { Input } from '../../components/ui/input'
import Modal from '../../components/ui/Modal'
import MoreActions from '../../components/ui/MoreActions'
import { SheetHeader } from '../../components/ui/Sheet'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { GET_ROLE } from '../../graphql/roles/GetRole.gql'
import { GET_ROLES_MGMT } from '../../graphql/roles/GetRoles.gql'
import { CREATE_ROLE } from '../../graphql/roles/CreateRole.gql'
import { DELETE_ROLE } from '../../graphql/roles/DeleteRole.gql'
import { UPDATE_ROLE } from '../../graphql/roles/UpdateRole.gql'
import type { CreateRoleData, DeleteRoleData, GetRoleData, UpdateRoleData } from '../../graphql/roles/types'
import { errorMessage } from '../../lib/utils'

// ── Permissions catalog ────────────────────────────────────
interface PermGroup {
  readonly label: string
  readonly perms: readonly string[]
}

const PERM_GROUPS: readonly PermGroup[] = [
  { label: 'Usuários',          perms: ['user.create', 'user.read', 'user.update', 'user.delete'] },
  { label: 'Perfis de acesso',  perms: ['role.create', 'role.read', 'role.update', 'role.delete'] },
  { label: 'Ativos',            perms: ['asset.create', 'asset.read', 'asset.update', 'asset.delete'] },
  { label: 'Ordens de Serviço', perms: ['workorder.create', 'workorder.read', 'workorder.update', 'workorder.delete', 'workorder.approve', 'workorder.execute'] },
  { label: 'Peças de Reposição',perms: ['sparepart.create', 'sparepart.read', 'sparepart.update', 'sparepart.delete'] },
  { label: 'Planos Preventivos',perms: ['preventiveplan.create', 'preventiveplan.read', 'preventiveplan.update', 'preventiveplan.delete'] },
  { label: 'Custos',            perms: ['cost.read', 'cost.manage'] },
  { label: 'Dashboard',         perms: ['dashboard.read'] },
  { label: 'Log de Auditoria',  perms: ['auditlog.read'] },
]

/** Colunas da matriz; o que não for CRUD (aprovar, gerenciar) vai em "Outras". */
const ACTION_COLUMNS = [
  { action: 'create', label: 'Criar' },
  { action: 'read', label: 'Visualizar' },
  { action: 'update', label: 'Editar' },
  { action: 'delete', label: 'Excluir' },
] as const

const OTHER_LABELS: Record<string, string> = {
  approve: 'Aprovar',
  execute: 'Executar',
  manage: 'Gerenciar',
}

function permFor(group: PermGroup, action: string): string | undefined {
  return group.perms.find((p) => p.split('.')[1] === action)
}

function otherPerms(group: PermGroup): readonly string[] {
  return group.perms.filter((p) => !ACTION_COLUMNS.some((c) => c.action === p.split('.')[1]))
}

// ── Form ──────────────────────────────────────────────────
interface FormState {
  name: string
  description: string
  permissions: Set<string>
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  permissions: new Set(),
}

export default function RoleEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const { hasPermission } = useAuth()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const { data: roleData, loading: roleLoading } = useQuery<GetRoleData>(
    GET_ROLE,
    { variables: { id: Number(id) }, skip: !isEdit },
  )
  usePageCrumb(roleData?.role?.name)

  // Preenche o formulário quando os dados chegam — ajuste de estado no render,
  // não em efeito (react.dev/learn/you-might-not-need-an-effect).
  const [loadedData, setLoadedData] = useState<typeof roleData>(undefined)
  if (roleData !== loadedData) {
    setLoadedData(roleData)
    if (roleData?.role) {
      const { role } = roleData
      setForm({
        name: role.name,
        description: role.description ?? '',
        permissions: new Set(role.permissions as string[]),
      })
    }
  }

  const [createRole, { loading: creating }] = useMutation<CreateRoleData>(CREATE_ROLE, {
    refetchQueries: [{ query: GET_ROLES_MGMT }],
    onCompleted: () => navigate('/dashboard/roles'),
    onError: (err) => setSubmitError(errorMessage(err)),
  })

  const [updateRole, { loading: updating }] = useMutation<UpdateRoleData>(UPDATE_ROLE, {
    refetchQueries: [{ query: GET_ROLES_MGMT }],
    onCompleted: () => navigate('/dashboard/roles'),
    onError: (err) => setSubmitError(errorMessage(err)),
  })

  const [deleteRole, { loading: deleting }] = useMutation<DeleteRoleData>(DELETE_ROLE, {
    variables: { id: Number(id) },
    refetchQueries: [{ query: GET_ROLES_MGMT }],
    onCompleted: () => navigate('/dashboard/roles'),
    onError: (err) => {
      setDeleteOpen(false)
      setSubmitError(errorMessage(err))
    },
  })

  const submitting = creating || updating
  const isSystem = roleData?.role?.isSystem ?? false

  function togglePerm(perm: string, checked: boolean) {
    setForm((prev) => {
      const next = new Set(prev.permissions)
      if (checked) next.add(perm)
      else next.delete(perm)
      return { ...prev, permissions: next }
    })
  }

  function toggleGroup(perms: readonly string[], checked: boolean) {
    setForm((prev) => {
      const next = new Set(prev.permissions)
      perms.forEach((p) => (checked ? next.add(p) : next.delete(p)))
      return { ...prev, permissions: next }
    })
  }

  function validate(): boolean {
    if (!form.name.trim()) {
      setNameError('Nome é obrigatório.')
      return false
    }
    setNameError('')
    return true
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const input = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      permissions: Array.from(form.permissions),
    }

    if (isEdit) {
      void updateRole({ variables: { id: Number(id), input } })
    } else {
      void createRole({ variables: { input } })
    }
  }

  if (isEdit && roleLoading) {
    return (
      <div className="flex max-w-5xl flex-col gap-3 rounded-xs border border-rule bg-sheet p-5" role="status" aria-label="Carregando">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  const locked = submitting || isSystem
  const fullAccess = form.permissions.has('*')

  return (
    <>
      <FormLayout
        onSubmit={handleSubmit}
        noValidate
        header={
          <SheetHeader
            eyebrow="Perfil de acesso"
            title={isEdit ? 'Editar perfil de acesso' : 'Novo perfil de acesso'}
            actions={
              isEdit && !isSystem ? (
                <MoreActions
                  align="start"
                  items={[
                    {
                      label: 'Excluir perfil',
                      danger: true,
                      onSelect: () => setDeleteOpen(true),
                      disabledReason: hasPermission('role.delete') ? undefined : 'Você não tem permissão para esta ação',
                    },
                  ]}
                />
              ) : undefined
            }
          >
            {isSystem && (
              <span className="mt-1">
                <Badge variant="info">Perfil de sistema</Badge>
              </span>
            )}
          </SheetHeader>
        }
      >
        {isSystem && (
          <FormAlert variant="warning">Este é um perfil de sistema e não pode ser editado.</FormAlert>
        )}
        {submitError && <FormAlert>{submitError}</FormAlert>}

        <FormSection title="Identificação">
          <FormGrid columns={2}>
            <FormField>
              <Input
                label="Nome do perfil"
                required
                name="name"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                  if (nameError) setNameError('')
                }}
                error={nameError}
                placeholder="Ex.: Supervisor"
                disabled={locked}
              />
            </FormField>
            <FormField>
              <Input
                label="Descrição (opcional)"
                name="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva as responsabilidades deste perfil"
                disabled={locked}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Permissões"
          hint="Marque o que os usuários deste perfil podem fazer. A caixa da linha marca o recurso inteiro."
        >
          {fullAccess && (
            <FormAlert variant="success" className="m-0 mb-3">
              Acesso total (*): este perfil passa em todas as permissões.
            </FormAlert>
          )}
          <div className="overflow-x-auto border border-rule">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-subtle text-xs text-quiet">
                  <th scope="col" className="border-b border-rule px-3 py-2 text-left font-medium">
                    Recurso
                  </th>
                  {ACTION_COLUMNS.map((c) => (
                    <th key={c.action} scope="col" className="w-24 border-b border-l border-rule px-2 py-2 text-center font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th scope="col" className="border-b border-l border-rule px-3 py-2 text-left font-medium">
                    Outras
                  </th>
                </tr>
              </thead>
              <tbody>
                {PERM_GROUPS.map((group) => {
                  const allChecked = group.perms.every((p) => form.permissions.has(p))
                  const someChecked = group.perms.some((p) => form.permissions.has(p))
                  const others = otherPerms(group)
                  return (
                    <tr key={group.label} className="border-b border-rule last:border-b-0 hover:bg-subtle/60">
                      <th scope="row" className="px-3 py-2 text-left font-medium text-ink">
                        <label htmlFor={`group-${group.label}`} className="flex items-center gap-2.5">
                          <Checkbox
                            id={`group-${group.label}`}
                            checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                            onCheckedChange={(checked) => toggleGroup(group.perms, checked === true)}
                            disabled={locked}
                          />
                          {group.label}
                        </label>
                      </th>
                      {ACTION_COLUMNS.map((c) => {
                        const perm = permFor(group, c.action)
                        return (
                          <td key={c.action} className="border-l border-rule px-2 py-2 text-center">
                            {perm ? (
                              <Checkbox
                                id={perm}
                                aria-label={`${c.label} — ${group.label}`}
                                checked={form.permissions.has(perm)}
                                onCheckedChange={(checked) => togglePerm(perm, checked === true)}
                                disabled={locked}
                              />
                            ) : (
                              <span className="text-faint" aria-hidden="true">
                                ·
                              </span>
                            )}
                          </td>
                        )
                      })}
                      <td className="border-l border-rule px-3 py-2">
                        <span className="flex flex-wrap gap-x-4 gap-y-1">
                          {others.map((perm) => {
                            const label = OTHER_LABELS[perm.split('.')[1]] ?? perm
                            return (
                              <label key={perm} htmlFor={perm} className="flex items-center gap-1.5 text-body">
                                <Checkbox
                                  id={perm}
                                  aria-label={`${label} — ${group.label}`}
                                  checked={form.permissions.has(perm)}
                                  onCheckedChange={(checked) => togglePerm(perm, checked === true)}
                                  disabled={locked}
                                />
                                {label}
                              </label>
                            )
                          })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="link" onClick={() => navigate('/dashboard/roles')} disabled={submitting}>
            {isSystem ? 'Voltar' : 'Cancelar'}
          </Button>
          {!isSystem && (
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar perfil'}
            </Button>
          )}
        </FormActions>
      </FormLayout>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir perfil de acesso"
        size="sm"
        footer={
          <>
            <Button variant="link" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => deleteRole()}>
              Confirmar exclusão
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-body">
          Excluir o perfil <strong>{form.name}</strong>? Usuários atribuídos a ele poderão perder acesso ao sistema.
        </p>
      </Modal>
    </>
  )
}
