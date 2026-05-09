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
  accent?: 'default' | 'red' | 'amber' | 'green' | 'indigo'
  icon?: React.ReactNode
}

const accentText: Record<string, string> = {
  default: 'text-gray-900',
  red: 'text-red-600',
  amber: 'text-amber-600',
  green: 'text-green-600',
  indigo: 'text-indigo-600',
}

export function StatCard({ label, value, sub, accent = 'default', icon }: StatCardProps) {
  return (
    <Card>
      <div className="px-6 py-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>
        <p className={cn('mt-2 text-3xl font-bold', accentText[accent])}>{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
    </Card>
  )
}
