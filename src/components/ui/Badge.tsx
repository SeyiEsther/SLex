import { cn } from '@/lib/utils'
import type { IssueSeverity, IssueType } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'critical' | 'warning' | 'info' | 'success' | 'neutral'
  className?: string
}

const variantClasses: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  neutral: 'bg-gray-100 text-gray-600',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const map: Record<IssueSeverity, { label: string; variant: BadgeProps['variant'] }> = {
    critical: { label: 'Critical', variant: 'critical' },
    warning: { label: 'Warning', variant: 'warning' },
    info: { label: 'Info', variant: 'info' },
  }
  const { label, variant } = map[severity]
  return <Badge variant={variant}>{label}</Badge>
}

export function IssueTypeBadge({ type }: { type: IssueType }) {
  const labels: Record<IssueType, string> = {
    ghost_employee: 'Ghost Employee',
    missing_deduction: 'Missing Deduction',
    duplicate_billing: 'Duplicate Billing',
    name_mismatch: 'Name Mismatch',
    missing_data: 'Missing Data',
  }
  return <Badge variant="neutral">{labels[type]}</Badge>
}
