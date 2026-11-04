import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { ChevronDown, CircleUserRound, LogOut } from 'lucide-react'

import Skeleton from '../ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { useAppearance } from '../../contexts/AppearanceContext'
import { GET_ME } from '../../graphql/users/GetMe.gql'
import type { GetMeData } from '../../graphql/users/types'
import type { SizePreference, ThemePreference } from '../../lib/appearance'
import { cn } from '../../lib/utils'

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
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-quiet">{label}</span>
      <div className="grid grid-cols-3 gap-0.5 rounded-xs bg-subtle p-0.5" role="radiogroup" aria-label={label}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={choice.value === value}
            className="rounded-xs px-1 py-1 text-xs font-medium text-quiet hover:text-ink aria-checked:bg-sheet aria-checked:text-ink aria-checked:shadow-sm"
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
  const { data, loading } = useQuery<GetMeData>(GET_ME)
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

  function handleProfile() {
    setIsOpen(false)
    navigate('/dashboard/profile')
  }

  const me = data?.me
  // O e-mail do token só serve de reserva se GET_ME falhar; enquanto carrega, esqueleto
  const loadingName = loading && !me
  const displayName = me?.name ?? email ?? 'Usuário'
  const displayEmail = me?.email ?? email ?? ''

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-left text-sm text-body hover:bg-subtle'

  return (
    <div className="relative ml-1" ref={containerRef}>
      <button
        type="button"
        className="flex h-9 max-w-64 items-center gap-2 rounded-xs px-1.5 text-sm font-medium text-body hover:bg-subtle"
        aria-label="Menu do usuário"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((o) => !o)}
      >
        <CircleUserRound className="size-6 shrink-0 text-faint" aria-hidden="true" />
        {loadingName ? (
          <Skeleton className="w-24 max-sm:hidden" />
        ) : (
          <span className="truncate max-sm:hidden">{displayName}</span>
        )}
        <ChevronDown
          className={cn('size-3.5 shrink-0 text-faint transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 z-50 mt-2 w-72 rounded-xs border border-rule bg-sheet p-1.5 shadow-lg"
          role="dialog"
          aria-label="Menu do usuário"
        >
          <div className="mb-1.5 flex flex-col gap-0.5 border-b border-rule px-2.5 pt-2 pb-2.5">
            <span className="text-[0.6875rem] text-faint">Conectado como</span>
            <span className="truncate text-sm font-semibold text-ink">{displayName}</span>
            {displayEmail && <span className="truncate text-xs text-quiet">{displayEmail}</span>}
          </div>

          <button type="button" className={itemClass} onClick={handleProfile}>
            <CircleUserRound className="size-4 shrink-0" aria-hidden="true" />
            Meu perfil
          </button>

          <div className="my-1.5 flex flex-col gap-2.5 border-y border-rule p-2.5">
            <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-wider text-faint">
              Aparência
            </span>
            <Segmented label="Tema" choices={THEME_CHOICES} value={theme} onChange={setTheme} />
            <Segmented label="Tamanho" choices={SIZE_CHOICES} value={size} onChange={setSize} />
          </div>

          <button type="button" className={cn(itemClass, 'text-error')} onClick={handleLogout}>
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
