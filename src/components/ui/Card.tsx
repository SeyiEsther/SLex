import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'default' | 'red' | 'amber' | 'green' | 'royal'
  icon?: React.ReactNode
}

const accentText: Record<string, string> = {
  default: '#162660',
  red: '#dc2626',
  amber: '#d97706',
  green: '#16a34a',
  royal: '#162660',
}

export function StatCard({ label, value, sub, accent = 'default', icon }: StatCardProps) {
  return (
    <Card>
      <div className="px-6 py-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {icon && <div style={{ color: '#162660', opacity: 0.4 }}>{icon}</div>}
        </div>
        <p className="mt-2 text-3xl font-bold" style={{ color: accentText[accent] }}>{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
    </Card>
  )
}
