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
import { SheetHeader } from '../../components/ui/Sheet'
import Skeleton from '../../components/ui/Skeleton'
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
    <FormLayout
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      header={<SheetHeader eyebrow="Conta" title="Meu perfil" meta={[{ label: 'Perfil de acesso', value: profile.role.name }]} />}
    >
      {submitError && <FormAlert>{submitError}</FormAlert>}
      {saved && <FormAlert variant="success">Perfil atualizado.</FormAlert>}

      <FormSection title="Dados pessoais">
        <FormGrid columns={2}>
          <FormField>
            <Input
              label="Nome completo"
              required
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
              required
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

      <FormSection title="Acesso" hint="O perfil de acesso é definido por um administrador.">
        <FormGrid columns={1} className="max-w-md">
          <FormField>
            <Input label="Perfil de acesso" name="role" value={profile.role.name} readOnly disabled />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="link" onClick={() => navigate('/dashboard')} disabled={submitting}>
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

  if (loading) {
    return (
      <div className="flex max-w-5xl flex-col gap-3 rounded-xs border border-rule bg-sheet p-5" role="status" aria-label="Carregando">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  if (error) return <FormAlert className="m-0">Não foi possível carregar o perfil: {error.message}</FormAlert>

  return data?.me ? <ProfileForm key={data.me.id} profile={data.me} /> : null
}
