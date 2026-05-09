import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/Card'
import { SeverityBadge, IssueTypeBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReconciliationRun } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: runs } = await supabase
    .from('reconciliation_runs')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const allRuns: ReconciliationRun[] = runs ?? []

  const totalIssues = allRuns.reduce((s, r) => s + (r.total_issues ?? 0), 0)
  const criticalIssues = allRuns.reduce((s, r) => s + (r.critical_issues ?? 0), 0)
  const totalLeakage = allRuns.reduce((s, r) => s + (r.estimated_monthly_leakage ?? 0), 0)
  const totalRuns = allRuns.length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Payroll &amp; benefits reconciliation overview
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New reconciliation run
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Runs"
          value={totalRuns}
          sub="All time"
          accent="default"
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Total Issues Found"
          value={totalIssues}
          sub="Across all runs"
          accent="default"
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          label="Critical Issues"
          value={criticalIssues}
          sub="Require immediate action"
          accent={criticalIssues > 0 ? 'red' : 'default'}
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Est. Monthly Leakage"
          value={formatCurrency(totalLeakage)}
          sub="Across all runs"
          accent={totalLeakage > 0 ? 'amber' : 'default'}
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Recent runs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Reconciliation Runs</h2>
          {allRuns.length > 0 && (
            <Link href="/upload" className="text-sm text-indigo-600 hover:underline font-medium">
              New run →
            </Link>
          )}
        </div>

        {allRuns.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-indigo-500">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No runs yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload your payroll and benefits CSVs to start detecting issues.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Start first reconciliation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-3">Run name</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Total issues</th>
                  <th className="px-6 py-3">Critical</th>
                  <th className="px-6 py-3">Est. leakage / mo</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{run.name}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(run.created_at)}</td>
                    <td className="px-6 py-4 text-gray-700">{run.total_issues}</td>
                    <td className="px-6 py-4">
                      {run.critical_issues > 0 ? (
                        <span className="text-red-600 font-semibold">{run.critical_issues}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-amber-700 font-medium">
                      {run.estimated_monthly_leakage > 0
                        ? formatCurrency(run.estimated_monthly_leakage)
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/results/${run.id}`}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
