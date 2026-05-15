import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/checkbox'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import Spinner from '../../components/ui/Spinner'
import { GET_ROLE } from '../../graphql/roles/GetRole.gql'
import { GET_ROLES_MGMT } from '../../graphql/roles/GetRoles.gql'
import { CREATE_ROLE } from '../../graphql/roles/CreateRole.gql'
import { UPDATE_ROLE } from '../../graphql/roles/UpdateRole.gql'
import type { CreateRoleData, GetRoleData, UpdateRoleData } from '../../graphql/roles/types'
import './RoleEditPage.css'

// ── Permissions catalog ────────────────────────────────────
interface PermGroup {
  readonly label: string
  readonly perms: readonly string[]
}

const PERM_GROUPS: readonly PermGroup[] = [
  { label: 'Usuários',          perms: ['user.create', 'user.read', 'user.update', 'user.delete'] },
  { label: 'Roles',             perms: ['role.create', 'role.read', 'role.update', 'role.delete'] },
  { label: 'Ativos',            perms: ['asset.create', 'asset.read', 'asset.update', 'asset.delete'] },
  { label: 'Ordens de Serviço', perms: ['workorder.create', 'workorder.read', 'workorder.update', 'workorder.delete', 'workorder.approve'] },
  { label: 'Peças de Reposição',perms: ['sparepart.create', 'sparepart.read', 'sparepart.update', 'sparepart.delete'] },
  { label: 'Dashboard',         perms: ['dashboard.read'] },
  { label: 'Log de Auditoria',  perms: ['auditlog.read'] },
]

function permLabel(perm: string): string {
  const action = perm.split('.')[1]
  const labels: Record<string, string> = {
    create: 'Criar',
    read: 'Visualizar',
    update: 'Editar',
    delete: 'Excluir',
    approve: 'Aprovar',
  }
  return labels[action] ?? action
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

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const { data: roleData, loading: roleLoading } = useQuery<GetRoleData>(
    GET_ROLE,
    { variables: { id: Number(id) }, skip: !isEdit },
  )

  useEffect(() => {
    if (roleData?.role) {
      const { role } = roleData
      setForm({
        name: role.name,
        description: role.description ?? '',
        permissions: new Set(role.permissions as string[]),
      })
    }
  }, [roleData])

  const [createRole, { loading: creating }] = useMutation<CreateRoleData>(CREATE_ROLE, {
    refetchQueries: [{ query: GET_ROLES_MGMT }],
    onCompleted: () => navigate('/dashboard/roles'),
    onError: (err) => setSubmitError(err.graphQLErrors[0]?.message ?? err.message),
  })

  const [updateRole, { loading: updating }] = useMutation<UpdateRoleData>(UPDATE_ROLE, {
    refetchQueries: [{ query: GET_ROLES_MGMT }],
    onCompleted: () => navigate('/dashboard/roles'),
    onError: (err) => setSubmitError(err.graphQLErrors[0]?.message ?? err.message),
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
      <div className="page-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="role-edit-page">
      <header className="page-header">
        <div className="page-header__info">
          <button
            type="button"
            className="role-edit-page__back"
            onClick={() => navigate('/dashboard/roles')}
          >
            ← Permissões
          </button>
          <h1 className="page-header__title">
            {isEdit ? 'Editar Role' : 'Nova Role'}
          </h1>
        </div>
      </header>

      {isSystem && (
        <div className="role-edit-page__system-notice" role="alert">
          Esta é uma role de sistema e não pode ser editada.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {submitError && (
          <div className="role-edit-page__alert" role="alert">
            {submitError}
          </div>
        )}

        <div className="role-edit-page__card">
          <h2 className="role-edit-page__section-title">Informações</h2>
          <div className="role-edit-page__fields">
            <Input
              label="Nome da role"
              name="name"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }))
                if (nameError) setNameError('')
              }}
              error={nameError}
              placeholder="Ex.: Supervisor"
              disabled={submitting || isSystem}
            />
            <Input
              label="Descrição (opcional)"
              name="description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Descreva as responsabilidades desta role"
              disabled={submitting || isSystem}
            />
          </div>
        </div>

        <div className="role-edit-page__card">
          <h2 className="role-edit-page__section-title">Permissões</h2>
          <p className="role-edit-page__section-hint">
            Selecione as permissões que os usuários desta role poderão exercer.
          </p>

          <div className="role-edit-page__perm-groups">
            {PERM_GROUPS.map((group) => {
              const allChecked = group.perms.every((p) => form.permissions.has(p))
              const someChecked = group.perms.some((p) => form.permissions.has(p))

              return (
                <div key={group.label} className="role-edit-page__perm-group">
                  <div className="role-edit-page__perm-group-header">
                    <Checkbox
                      id={`group-${group.label}`}
                      checked={allChecked}
                      data-indeterminate={!allChecked && someChecked}
                      onCheckedChange={(checked) =>
                        toggleGroup(group.perms, checked === true)
                      }
                      disabled={submitting || isSystem}
                    />
                    <Label
                      htmlFor={`group-${group.label}`}
                      className="role-edit-page__perm-group-label"
                    >
                      {group.label}
                    </Label>
                  </div>
                  <div className="role-edit-page__perm-items">
                    {group.perms.map((perm) => (
                      <div key={perm} className="role-edit-page__perm-item">
                        <Checkbox
                          id={perm}
                          checked={form.permissions.has(perm)}
                          onCheckedChange={(checked) =>
                            togglePerm(perm, checked === true)
                          }
                          disabled={submitting || isSystem}
                        />
                        <Label htmlFor={perm} className="role-edit-page__perm-label">
                          {permLabel(perm)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <footer className="role-edit-page__footer">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard/roles')}
            disabled={submitting}
          >
            Cancelar
          </Button>
          {!isSystem && (
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Salvar alterações' : 'Criar role'}
            </Button>
          )}
        </footer>
      </form>
    </div>
  )
}
