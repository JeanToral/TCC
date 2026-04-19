import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { AlertIcon, CheckIcon, EyeIcon, EyeOffIcon, GearIcon, SpinnerIcon } from '../../components/icons'
import './LoginPage.css'

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
  const [loading, setLoading] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const validationErrors = validate(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    setErrors({})
    // TODO: conectar mutation GraphQL de login
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="login-root">
      {/* Painel esquerdo — branding */}
      <aside className="login-brand">
        <div className="login-brand__content">
          <div className="login-brand__logo">
            <span className="login-brand__logo-icon">
              <GearIcon />
            </span>
            <span className="login-brand__logo-text">CMMS</span>
          </div>
          <h1 className="login-brand__title">
            Gestão de Manutenção Industrial
          </h1>
          <p className="login-brand__subtitle">
            Controle ordens de serviço, ativos, estoque e KPIs em uma única plataforma.
          </p>

          <ul className="login-brand__features">
            <li>
              <CheckIcon />
              Ordens de serviço com workflow completo
            </li>
            <li>
              <CheckIcon />
              Manutenção preventiva e corretiva
            </li>
            <li>
              <CheckIcon />
              KPIs: MTBF, MTTR e OEE em tempo real
            </li>
          </ul>
        </div>

        <div className="login-brand__decoration" aria-hidden="true">
          <div className="login-brand__circle login-brand__circle--1" />
          <div className="login-brand__circle login-brand__circle--2" />
          <div className="login-brand__grid" />
        </div>
      </aside>

      {/* Painel direito — formulário */}
      <main className="login-form-panel">
        <div className="login-form-card">
          <header className="login-form-card__header">
            <h2 className="login-form-card__title">Entrar na plataforma</h2>
            <p className="login-form-card__description">
              Acesse com suas credenciais corporativas.
            </p>
          </header>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {errors.general && (
              <div className="login-form__alert" role="alert">
                <AlertIcon />
                {errors.general}
              </div>
            )}

            <div className="login-form__group">
              <label className="login-form__label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                className={`login-form__input${errors.email ? ' login-form__input--error' : ''}`}
                placeholder="seu@email.com"
                value={values.email}
                onChange={handleChange}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={loading}
              />
              {errors.email && (
                <span id="email-error" className="login-form__field-error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            <div className="login-form__group">
              <div className="login-form__label-row">
                <label className="login-form__label" htmlFor="password">
                  Senha
                </label>
                <a href="#" className="login-form__forgot">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="login-form__password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`login-form__input login-form__input--password${errors.password ? ' login-form__input--error' : ''}`}
                  placeholder="••••••••"
                  value={values.password}
                  onChange={handleChange}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-form__password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <span id="password-error" className="login-form__field-error" role="alert">
                  {errors.password}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="login-form__submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <SpinnerIcon className="login-form__spinner" />
                  Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <footer className="login-footer">
          CMMS &copy; {new Date().getFullYear()} — Unoesc São Miguel do Oeste
        </footer>
      </main>
    </div>
  )
}

