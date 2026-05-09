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

  if (runError || !run) {
    notFound()
  }

  const { data: issuesRaw } = await supabase
    .from('reconciliation_issues')
    .select('*')
    .eq('run_id', params.runId)
    .order('severity', { ascending: true }) // critical first (alphabetically c < i < w happens to work)

  const issues: ReconciliationIssue[] = (issuesRaw ?? []).sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order]
  })

  const criticalCount = issues.filter((i) => i.severity === 'critical').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const infoCount = issues.filter((i) => i.severity === 'info').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Dashboard
        </Link>
      </div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{run.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Reconciliation run · {formatDate(run.created_at)}
            {run.payroll_row_count && run.benefits_row_count && (
              <> · {run.payroll_row_count} payroll records · {run.benefits_row_count} benefit records</>
            )}
          </p>
        </div>
        <Link
          href="/upload"
          className="text-sm text-indigo-600 hover:underline font-medium"
        >
          New run →
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Issues"
          value={run.total_issues}
          sub="Found in this run"
          accent="default"
        />
        <StatCard
          label="Critical"
          value={criticalCount}
          sub="Immediate action needed"
          accent={criticalCount > 0 ? 'red' : 'default'}
        />
        <StatCard
          label="Warnings"
          value={warningCount}
          sub="Review recommended"
          accent={warningCount > 0 ? 'amber' : 'default'}
        />
        <StatCard
          label="Est. Monthly Leakage"
          value={run.estimated_monthly_leakage > 0 ? formatCurrency(run.estimated_monthly_leakage) : '—'}
          sub={run.estimated_monthly_leakage > 0 ? `≈ ${formatCurrency(run.estimated_monthly_leakage * 12)} / year` : 'No direct cost detected'}
          accent={run.estimated_monthly_leakage > 0 ? 'amber' : 'default'}
        />
      </div>

      {/* Issue breakdown bar */}
      {issues.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Breakdown</span>
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-red-700">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                {warningCount} warnings
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                {infoCount} info
              </span>
            )}
          </div>
        </div>
      )}

      {/* Issues table */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">
        Issues Found
      </h2>

      {issues.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-16 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No issues detected</h3>
          <p className="text-sm text-gray-500">
            Your payroll and benefits data appear to be in sync.
          </p>
        </div>
      ) : (
        <IssueTable issues={issues} />
      )}
    </div>
  )
}
