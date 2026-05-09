import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/Card'
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
    .limit(20)

  const allRuns: ReconciliationRun[] = runs ?? []

  const totalRuns = allRuns.length
  const totalIssues = allRuns.reduce((s, r) => s + (r.total_issues ?? 0), 0)
  const totalGhosts = allRuns.reduce((s, r) => s + (r.ghost_employees ?? 0), 0)
  const totalLeakage = allRuns.reduce((s, r) => s + Number(r.estimated_monthly_leakage ?? 0), 0)

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#162660' }}>Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Payroll &amp; benefits reconciliation overview</p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: '#162660' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0e1b4a' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#162660' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New run
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Runs"
          value={totalRuns}
          sub="Reconciliation runs"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Total Issues"
          value={totalIssues}
          sub="Across all runs"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          label="Ghost Employees"
          value={totalGhosts}
          sub="Still billed after leaving"
          accent={totalGhosts > 0 ? 'red' : 'default'}
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          label="Est. Monthly Leakage"
          value={totalLeakage > 0 ? formatCurrency(totalLeakage) : '—'}
          sub={totalLeakage > 0 ? `≈ ${formatCurrency(totalLeakage * 12)}/year` : 'No leakage detected'}
          accent={totalLeakage > 0 ? 'amber' : 'default'}
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Empty state */}
      {allRuns.length === 0 && (
        <div
          className="rounded-xl border-2 border-dashed px-6 py-14 text-center mb-8 bg-white"
          style={{ borderColor: '#D0E6FD' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#D0E6FD' }}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#162660' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#162660' }}>
            Start your first reconciliation
          </h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            Upload a payroll export and benefits invoice. SLex finds ghost employees, duplicate charges, and missing deductions automatically.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            style={{ backgroundColor: '#162660' }}
          >
            Upload files and reconcile →
          </Link>
        </div>
      )}

      {/* History table */}
      {allRuns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: '#162660' }}>Reconciliation History</h2>
            <Link href="/upload" className="text-sm font-medium hover:underline" style={{ color: '#162660' }}>
              + New run
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100"
                    style={{ backgroundColor: '#faf8f5' }}>
                  <th className="px-5 py-3">Run name</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Payroll file</th>
                  <th className="px-5 py-3">Benefits file</th>
                  <th className="px-5 py-3 text-center">Issues</th>
                  <th className="px-5 py-3 text-center">Ghosts</th>
                  <th className="px-5 py-3 text-right">Leakage/mo</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium max-w-[180px] truncate" style={{ color: '#162660' }}>
                      {run.name}
                    </td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                      {formatDate(run.created_at)}
                    </td>
                    <td className="px-5 py-4 text-gray-400 max-w-[130px] truncate text-xs font-mono">
                      {run.payroll_filename ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-400 max-w-[130px] truncate text-xs font-mono">
                      {run.benefits_filename ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-center text-gray-700">{run.total_issues}</td>
                    <td className="px-5 py-4 text-center">
                      {run.ghost_employees > 0 ? (
                        <span className="font-semibold text-red-600">{run.ghost_employees}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {Number(run.estimated_monthly_leakage) > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          {formatCurrency(Number(run.estimated_monthly_leakage))}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/results/${run.id}`}
                        className="text-sm font-medium hover:underline whitespace-nowrap"
                        style={{ color: '#162660' }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
