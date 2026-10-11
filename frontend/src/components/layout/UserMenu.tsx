import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ChevronDownIcon, LogOutIcon, UserCircleIcon } from '../icons'
import { useAuth } from '../../contexts/AuthContext'
import { useAppearance } from '../../contexts/AppearanceContext'
import type { SizePreference, ThemePreference } from '../../lib/appearance'

interface Choice<T extends string> {
  readonly value: T
  readonly label: string
}

const THEME_CHOICES: readonly Choice<ThemePreference>[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
]

const SIZE_CHOICES: readonly Choice<SizePreference>[] = [
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
]

interface SegmentedProps<T extends string> {
  readonly label: string
  readonly choices: readonly Choice<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
}

function Segmented<T extends string>({ label, choices, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="user-menu__field">
      <span className="user-menu__field-label">{label}</span>
      <div className="user-menu__segmented" role="radiogroup" aria-label={label}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={choice.value === value}
            className={`user-menu__segment${choice.value === value ? ' user-menu__segment--active' : ''}`}
            onClick={() => onChange(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function UserMenu() {
  const navigate = useNavigate()
  const { email, logout } = useAuth()
  const { theme, size, setTheme, setSize } = useAppearance()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const displayName = email ?? 'Usuário'

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-label="Menu do usuário"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((o) => !o)}
      >
        <span className="user-menu__avatar">
          <UserCircleIcon />
        </span>
        <span className="user-menu__name">{displayName}</span>
        <span className={`user-menu__chevron${isOpen ? ' user-menu__chevron--open' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen && (
        <div className="user-menu__panel" role="dialog" aria-label="Menu do usuário">
          <div className="user-menu__header">
            <span className="user-menu__header-label">Conectado como</span>
            <span className="user-menu__header-email">{displayName}</span>
          </div>

          <button type="button" className="user-menu__item" disabled title="Disponível em breve">
            <UserCircleIcon />
            Meu perfil
          </button>

          <div className="user-menu__section">
            <span className="user-menu__section-title">Aparência</span>
            <Segmented label="Tema" choices={THEME_CHOICES} value={theme} onChange={setTheme} />
            <Segmented label="Tamanho" choices={SIZE_CHOICES} value={size} onChange={setSize} />
          </div>

          <button type="button" className="user-menu__item user-menu__item--danger" onClick={handleLogout}>
            <LogOutIcon />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
