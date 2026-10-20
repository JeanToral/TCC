import { cn } from '../../lib/utils'

interface SkeletonProps {
  readonly className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
  return <span aria-hidden="true" className={cn('block h-3.5 animate-pulse rounded-xs bg-subtle', className)} />
}
