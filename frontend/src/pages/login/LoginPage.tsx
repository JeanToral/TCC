import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'

import { Check, CircleAlert, Cog, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { LOGIN } from '../../graphql/auth/Login.gql'
import type { LoginMutationResult, LoginMutationVariables } from '../../graphql/auth/Login.gql'
import { cn, errorMessage } from '../../lib/utils'

interface LoginFormState {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

function validate(values: LoginFormState): FormErrors {
  const errors: FormErrors = {}
  if (!values.email) {
    errors.email = 'E-mail é obrigatório.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Informe um e-mail válido.'
  }
  if (!values.password) {
    errors.password = 'Senha é obrigatória.'
  }
  return errors
}

export default function LoginPage() {
  const [values, setValues] = useState<LoginFormState>({ email: '', password: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard'

  const [loginMutation, { loading }] = useMutation<LoginMutationResult, LoginMutationVariables>(LOGIN, {
    onCompleted(data) {
      login(data.login.accessToken)
      navigate(from, { replace: true })
    },
    onError(error) {
      const message = errorMessage(error, 'Erro ao conectar com o servidor.')
      const isCredentials = message.toLowerCase().includes('credenciais') || message.toLowerCase().includes('unauthorized')
      setErrors({ general: isCredentials ? 'E-mail ou senha incorretos.' : message })
    },
  })

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validationErrors = validate(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    void loginMutation({ variables: { input: { email: values.email, password: values.password } } })
  }

  const inputClass = (hasError: boolean) =>
    cn(
      'h-[2.625rem] w-full rounded-md border-[1.5px] bg-sheet px-3.5 text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow]',
      'placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-60',
      hasError
        ? 'border-error focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--error)_10%,transparent)]'
        : 'border-rule focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--primary-light)]',
    )

  return (
    <div className="flex min-h-screen max-md:flex-col">
      {/* Painel esquerdo — branding */}
      <aside className="relative flex w-[42%] shrink-0 items-center justify-center overflow-hidden bg-sidebar p-12 max-md:w-full max-md:px-6 max-md:py-8">
        <div className="relative z-[1] max-w-[360px]">
          <div className="mb-10 flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-inverse">
              <Cog className="size-[1.375rem]" aria-hidden="true" />
            </span>
            <span className="text-[1.375rem] font-bold tracking-[0.08em] text-inverse">CMMS</span>
          </div>
          <h1 className="mb-3.5 text-[1.75rem] font-bold leading-tight text-inverse max-md:text-[1.375rem]">
            Gestão de Manutenção Industrial
          </h1>
          <p className="mb-9 text-[0.9375rem] leading-relaxed text-inverse/55">
            Controle ordens de serviço, ativos, estoque e KPIs em uma única plataforma.
          </p>

          <ul className="flex flex-col gap-3.5 max-md:hidden">
            {[
              'Ordens de serviço com workflow completo',
              'Manutenção preventiva e corretiva',
              'KPIs: MTBF, MTTR e OEE em tempo real',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm font-medium text-inverse/75">
                <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-40 -bottom-40 size-[480px] rounded-full bg-primary opacity-[0.06]" />
          <div className="absolute -top-20 -left-20 size-[280px] rounded-full bg-primary opacity-[0.06]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>
      </aside>

      {/* Painel direito — formulário */}
      <main className="flex flex-1 flex-col items-center justify-center bg-canvas px-6 py-8">
        <div className="w-full max-w-[420px] rounded-lg border border-rule bg-sheet px-9 py-10 shadow-lg max-md:px-6 max-md:py-7">
          <header className="mb-8">
            <h2 className="mb-1.5 text-[1.375rem] font-bold text-ink">Entrar na plataforma</h2>
            <p className="text-sm text-quiet">Acesse com suas credenciais corporativas.</p>
          </header>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            {errors.general && (
              <div
                className="flex items-center gap-2 rounded-md border border-error/25 bg-error-soft px-4 py-3 text-sm font-medium text-error"
                role="alert"
              >
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                {errors.general}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8125rem] font-semibold tracking-[0.01em] text-ink" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                className={inputClass(!!errors.email)}
                placeholder="seu@email.com"
                value={values.email}
                onChange={handleChange}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={loading}
              />
              {errors.email && (
                <span id="email-error" className="text-[0.8125rem] font-medium text-error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8125rem] font-semibold tracking-[0.01em] text-ink" htmlFor="password">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn(inputClass(!!errors.password), 'pr-11')}
                  placeholder="••••••••"
                  value={values.password}
                  onChange={handleChange}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-[2.625rem] items-center justify-center rounded-r-md text-faint outline-none transition-colors hover:text-quiet"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-[1.125rem]" aria-hidden="true" />
                  ) : (
                    <Eye className="size-[1.125rem]" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <span id="password-error" className="text-[0.8125rem] font-medium text-error" role="alert">
                  {errors.password}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-[0.9375rem] font-semibold tracking-[0.01em] text-inverse transition-[background-color,opacity,transform] hover:enabled:bg-primary-hover active:enabled:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="size-[1.125rem] animate-spin" aria-hidden="true" />
                  Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <footer className="mt-8 text-center text-xs text-faint">
          CMMS &copy; {new Date().getFullYear()} — Unoesc São Miguel do Oeste
        </footer>
      </main>
    </div>
  )
}
