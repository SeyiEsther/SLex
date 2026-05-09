import { cn } from '@/lib/utils'
import type { IssueSeverity, IssueType } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'critical' | 'warning' | 'info' | 'success' | 'neutral' | 'royal'
  className?: string
}

const variantStyles: Record<string, React.CSSProperties> = {
  default: { backgroundColor: '#f3f4f6', color: '#374151' },
  critical: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  warning: { backgroundColor: '#fef3c7', color: '#b45309' },
  info: { backgroundColor: '#D0E6FD', color: '#162660' },
  success: { backgroundColor: '#dcfce7', color: '#15803d' },
  neutral: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  royal: { backgroundColor: '#162660', color: '#D0E6FD' },
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', className)}
      style={variantStyles[variant]}
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
