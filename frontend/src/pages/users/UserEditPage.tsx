import { type ChangeEvent, type FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import { useAuth } from '../../contexts/AuthContext'
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
import { Label } from '../../components/ui/label'
import { NativeSelect } from '../../components/ui/select'
import Spinner from '../../components/ui/Spinner'
import { CREATE_USER } from '../../graphql/users/CreateUser.gql'
import { GET_USER } from '../../graphql/users/GetUser.gql'
import { GET_ROLES } from '../../graphql/users/GetRoles.gql'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import { UPDATE_USER } from '../../graphql/users/UpdateUser.gql'
import type {
  CreateUserData,
  GetRolesData,
  GetUserData,
  UpdateUserData,
} from '../../graphql/users/types'
import { errorMessage } from '../../lib/utils'
import './UserEditPage.css'

interface FormState {
  name: string
  email: string
  password: string
  roleId: string
  isActive: boolean
  hourlyRate: string
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  roleId: '',
  isActive: true,
  hourlyRate: '',
}

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const { hasPermission } = useAuth()
  const canManageCost = hasPermission('cost.manage')

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [submitError, setSubmitError] = useState('')

  // Fetch current user (edit mode only)
  const { data: userData, loading: userLoading } = useQuery<GetUserData>(
    GET_USER,
    { variables: { id: Number(id) }, skip: !isEdit },
  )

  // Fetch available roles
  const { data: rolesData, loading: rolesLoading } = useQuery<GetRolesData>(GET_ROLES)

  // Preenche o formulário quando os dados chegam — ajuste de estado no render,
  // não em efeito (react.dev/learn/you-might-not-need-an-effect).
  const [loadedData, setLoadedData] = useState<typeof userData>(undefined)
  if (userData !== loadedData) {
    setLoadedData(userData)
    if (userData?.user) {
      const { user } = userData
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        roleId: String(user.roleId),
        isActive: user.isActive,
        hourlyRate: user.hourlyRate != null ? String(user.hourlyRate) : '',
      })
    }
  }

  const [createUser, { loading: creating }] = useMutation<CreateUserData>(
    CREATE_USER,
    {
      refetchQueries: [{ query: GET_USERS }],
      onCompleted: (data) =>
        navigate(`/dashboard/users/${data.createUser.id}`),
      onError: (err) => setSubmitError(errorMessage(err)),
    },
  )

  const [updateUser, { loading: updating }] = useMutation<UpdateUserData>(
    UPDATE_USER,
    {
      refetchQueries: [{ query: GET_USERS }],
      onCompleted: () => navigate(`/dashboard/users/${id}`),
      onError: (err) => setSubmitError(errorMessage(err)),
    },
  )

  const submitting = creating || updating

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    if (submitError) setSubmitError('')
  }

  function handleCheckboxChange(checked: boolean) {
    setForm((prev) => ({ ...prev, isActive: checked }))
  }

  function validate(): boolean {
    const next: Partial<FormState> = {}
    if (!form.name.trim()) next.name = 'Nome é obrigatório.'
    if (!form.email.trim()) {
      next.email = 'E-mail é obrigatório.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Informe um e-mail válido.'
    }
    if (!isEdit && !form.password) {
      next.password = 'Senha é obrigatória.'
    } else if (form.password && form.password.length < 8) {
      next.password = 'A senha deve ter pelo menos 8 caracteres.'
    }
    if (!form.roleId) next.roleId = 'Selecione uma função.'
    if (form.hourlyRate.trim()) {
      const rate = Number(form.hourlyRate)
      if (Number.isNaN(rate) || rate < 0) next.hourlyRate = 'Informe um valor válido.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    if (isEdit) {
      const input: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        roleId: Number(form.roleId),
        isActive: form.isActive,
      }
      if (form.password) input.password = form.password
      if (canManageCost && form.hourlyRate.trim()) {
        input.hourlyRate = Number(form.hourlyRate)
      }
      updateUser({ variables: { id: Number(id), input } })
    } else {
      createUser({
        variables: {
          input: {
            name: form.name,
            email: form.email,
            password: form.password,
            roleId: Number(form.roleId),
            ...(canManageCost && form.hourlyRate.trim()
              ? { hourlyRate: Number(form.hourlyRate) }
              : {}),
          },
        },
      })
    }
  }

  if (isEdit && userLoading) {
    return (
      <div className="page-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="user-edit-page">
      {/* Header */}
      <header className="page-header">
        <div className="page-header__info">
          <button
            type="button"
            className="page-back"
            onClick={() =>
              navigate(isEdit ? `/dashboard/users/${id}` : '/dashboard/users')
            }
          >
            ← {isEdit ? 'Voltar' : 'Usuários'}
          </button>
          <h1 className="page-header__title">
            {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
          </h1>
        </div>
      </header>

      {/* Form */}
      <FormLayout onSubmit={handleSubmit} noValidate>
        {submitError && <FormAlert>{submitError}</FormAlert>}

        <FormSection title="Informações do usuário">
          <FormGrid>
            <FormField>
              <Input
                label="Nome completo"
                name="name"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Ex.: João da Silva"
                autoComplete="name"
                disabled={submitting}
              />
            </FormField>
            <FormField>
              <Input
                label="E-mail"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="joao@empresa.com"
                autoComplete="email"
                disabled={submitting}
              />
            </FormField>
            <FormField>
              <Input
                label={isEdit ? 'Nova senha (opcional)' : 'Senha'}
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                placeholder={isEdit ? 'Deixe em branco para não alterar' : '••••••••'}
                autoComplete="new-password"
                hint="Mínimo de 8 caracteres."
                disabled={submitting}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Função e status">
          <FormGrid>
            <FormField>
              <NativeSelect
                id="roleId"
                name="roleId"
                label="Função"
                value={form.roleId}
                onChange={handleChange}
                disabled={submitting || rolesLoading}
                error={errors.roleId}
              >
                <option value="">
                  {rolesLoading ? 'Carregando funções…' : 'Selecione uma função'}
                </option>
                {rolesData?.roles.map((role) => (
                  <option key={role.id} value={String(role.id)}>
                    {role.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>

            {canManageCost && (
              <FormField>
                <Input
                  label="Taxa horária (R$)"
                  name="hourlyRate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.hourlyRate}
                  onChange={handleChange}
                  error={errors.hourlyRate}
                  placeholder="Ex.: 45,00"
                  hint="Usada no custo de mão de obra das OS atendidas."
                  disabled={submitting}
                />
              </FormField>
            )}

            {isEdit && (
              <FormField span="full">
                <div className="user-edit-page__toggle-row">
                  <div className="user-edit-page__toggle-label">
                    <Label htmlFor="isActive">Usuário ativo</Label>
                    <span className="user-edit-page__toggle-hint">
                      Usuários inativos não conseguem fazer login.
                    </span>
                  </div>
                  <Checkbox
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={handleCheckboxChange}
                    disabled={submitting}
                  />
                </div>
              </FormField>
            )}
          </FormGrid>
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigate(isEdit ? `/dashboard/users/${id}` : '/dashboard/users')
            }
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </Button>
        </FormActions>
      </FormLayout>
    </div>
  )
}
