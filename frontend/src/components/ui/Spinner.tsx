import './Spinner.css'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  readonly size?: SpinnerSize
  readonly className?: string
  readonly label?: string
}

export default function Spinner({ size = 'md', className, label = 'Carregando…' }: SpinnerProps) {
  return (
    <span
      className={`spinner spinner--${size}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.2"
        />
        <path
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
        />
      </svg>
    </span>
  )
}
