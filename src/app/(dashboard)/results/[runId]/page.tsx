import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/Card'
import IssueTable from '@/components/IssueTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReconciliationIssue } from '@/types'

interface PageProps {
  params: { runId: string }
}

export default async function ResultsPage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: run, error: runError } = await supabase
    .from('reconciliation_runs')
    .select('*')
    .eq('id', params.runId)
    .eq('user_id', user!.id)
    .single()

  if (runError || !run) notFound()

  const { data: issuesRaw } = await supabase
    .from('reconciliation_issues')
    .select('*')
    .eq('run_id', params.runId)

  const issues: ReconciliationIssue[] = (issuesRaw ?? []).sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as Record<string, number>
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
  })

  const criticalCount = issues.filter((i) => i.severity === 'critical').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const infoCount = issues.filter((i) => i.severity === 'info').length
  const ghostCount = issues.filter((i) => i.issue_type === 'ghost_employee').length

  const providers = Array.from(new Set(issues.map((i) => i.provider).filter(Boolean))) as string[]
  const departments = Array.from(new Set(issues.map((i) => i.department).filter(Boolean))) as string[]

  const leakage = Number(run.estimated_monthly_leakage ?? 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
        <span>›</span>
        <span className="text-gray-600">{run.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#162660' }}>{run.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(run.created_at)}
            {run.payroll_row_count && run.benefits_row_count && (
              <> · {run.payroll_row_count} payroll · {run.benefits_row_count} benefit records</>
            )}
            {run.payroll_filename && <> · <span className="font-mono text-xs">{run.payroll_filename}</span></>}
            {run.benefits_filename && <> &amp; <span className="font-mono text-xs">{run.benefits_filename}</span></>}
          </p>
        </div>
        <Link
          href="/upload"
          className="text-sm font-medium hover:underline shrink-0"
          style={{ color: '#162660' }}
        >
          + New run
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Issues" value={run.total_issues} sub="Found in this run" />
        <StatCard
          label="Ghost Employees"
          value={ghostCount}
          sub="Still billed, not on payroll"
          accent={ghostCount > 0 ? 'red' : 'default'}
        />
        <StatCard
          label="Warnings"
          value={warningCount}
          sub="Review recommended"
          accent={warningCount > 0 ? 'amber' : 'default'}
        />
        <StatCard
          label="Est. Monthly Leakage"
          value={leakage > 0 ? formatCurrency(leakage) : '—'}
          sub={leakage > 0 ? `≈ ${formatCurrency(leakage * 12)}/year` : 'No direct cost flagged'}
          accent={leakage > 0 ? 'amber' : 'default'}
        />
      </div>

      {/* Breakdown bar */}
      {issues.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 mb-6">
          <div className="flex items-center gap-6 flex-wrap text-xs">
            <span className="font-semibold uppercase tracking-wide text-gray-400">Breakdown</span>
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-700">
                <span className="w-2 h-2 rounded-full bg-red-500" />{criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" />{warningCount} warnings
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1.5" style={{ color: '#162660' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D0E6FD' }} />
                {infoCount} info
              </span>
            )}
            {providers.length > 0 && (
              <span className="text-gray-400 ml-auto">Providers: {providers.join(', ')}</span>
            )}
          </div>
        </div>
      )}

      {/* Issues */}
      <h2 className="text-base font-semibold mb-3" style={{ color: '#162660' }}>Issues Found</h2>

      {issues.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-16 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#D0E6FD' }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#162660' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#162660' }}>No issues detected</h3>
          <p className="text-sm text-gray-500">Your payroll and benefits data appear to be in sync.</p>
        </div>
      ) : (
        <IssueTable issues={issues} providers={providers} departments={departments} />
      )}
    </div>
  )
}
