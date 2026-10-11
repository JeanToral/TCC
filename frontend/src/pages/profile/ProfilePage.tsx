import { type ChangeEvent, type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import {
  FormActions,
  FormAlert,
  FormField,
  FormGrid,
  FormLayout,
  FormSection,
} from '../../components/ui/FormLayout'
import { Input } from '../../components/ui/input'
import { errorMessage } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'
import { GET_ME } from '../../graphql/users/GetMe.gql'
import { UPDATE_MY_PROFILE } from '../../graphql/users/UpdateMyProfile.gql'
import type {
  GetMeData,
  MyProfile,
  UpdateMyProfileData,
  UpdateMyProfileInput,
} from '../../graphql/users/types'

interface FormState {
  name: string
  email: string
  currentPassword: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ProfileForm({ profile }: { readonly profile: MyProfile }) {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()

  const [form, setForm] = useState<FormState>({
    name: profile.name,
    email: profile.email,
    currentPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [saved, setSaved] = useState(false)

  const [updateMyProfile, { loading: submitting }] = useMutation<UpdateMyProfileData>(
    UPDATE_MY_PROFILE,
  )

  const emailChanged = form.email.trim() !== profile.email
  const nameChanged = form.name.trim() !== profile.name
  const dirty = emailChanged || nameChanged

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setSubmitError('')
    setSaved(false)
  }

  function validate(): boolean {
    const next: FormErrors = {}
    const name = form.name.trim()
    const email = form.email.trim()
    if (name.length < 2) next.name = 'Informe o nome (mínimo de 2 caracteres).'
    if (!email) next.email = 'E-mail é obrigatório.'
    else if (!EMAIL_PATTERN.test(email)) next.email = 'Informe um e-mail válido.'
    if (emailChanged && !form.currentPassword) {
      next.currentPassword = 'Informe a senha atual para alterar o e-mail.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!dirty || !validate()) return

    const input: UpdateMyProfileInput = {
      ...(nameChanged ? { name: form.name.trim() } : {}),
      ...(emailChanged
        ? { email: form.email.trim(), currentPassword: form.currentPassword }
        : {}),
    }

    try {
      await updateMyProfile({ variables: { input } })
      // O JWT carrega o e-mail: renova a sessão para o token refletir o novo login.
      if (emailChanged) await refreshSession()
      setForm((prev) => ({ ...prev, currentPassword: '' }))
      setSaved(true)
    } catch (err) {
      setSubmitError(errorMessage(err))
    }
  }

  return (
    <FormLayout onSubmit={(e) => void handleSubmit(e)} noValidate>
      {submitError && <FormAlert>{submitError}</FormAlert>}
      {saved && <FormAlert variant="success">Perfil atualizado.</FormAlert>}

      <FormSection title="Dados pessoais">
        <FormGrid columns={2}>
          <FormField>
            <Input
              label="Nome completo"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
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
              hint="É o seu login no sistema."
              autoComplete="email"
              disabled={submitting}
            />
          </FormField>
          {emailChanged && (
            <FormField>
              <Input
                label="Senha atual"
                name="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={handleChange}
                error={errors.currentPassword}
                hint="Necessária para confirmar a troca de e-mail."
                autoComplete="current-password"
                disabled={submitting}
              />
            </FormField>
          )}
        </FormGrid>
      </FormSection>

      <FormSection title="Acesso" hint="O papel é definido por um administrador.">
        <FormGrid columns={2}>
          <FormField>
            <Input label="Papel" name="role" value={profile.role.name} readOnly disabled />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/dashboard')}
          disabled={submitting}
        >
          Voltar
        </Button>
        <Button type="submit" loading={submitting} disabled={!dirty}>
          Salvar alterações
        </Button>
      </FormActions>
    </FormLayout>
  )
}

export default function ProfilePage() {
  const { data, loading, error } = useQuery<GetMeData>(GET_ME)

  return (
    <div className="profile-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Meu perfil</h1>
        </div>
      </header>

      {loading && (
        <div className="page-loading">
          <Spinner size="lg" />
        </div>
      )}
      {error && <FormAlert>Não foi possível carregar o perfil: {error.message}</FormAlert>}
      {data?.me && <ProfileForm key={data.me.id} profile={data.me} />}
    </div>
  )
}
