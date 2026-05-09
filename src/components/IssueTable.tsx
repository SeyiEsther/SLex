'use client'

import { useState, useMemo } from 'react'
import { SeverityBadge, IssueTypeBadge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { ReconciliationIssue, IssueSeverity, IssueType } from '@/types'

interface IssueTableProps {
  issues: ReconciliationIssue[]
}

const SEVERITY_OPTIONS: { value: IssueSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

const TYPE_OPTIONS: { value: IssueType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'ghost_employee', label: 'Ghost Employee' },
  { value: 'missing_deduction', label: 'Missing Deduction' },
  { value: 'duplicate_billing', label: 'Duplicate Billing' },
  { value: 'name_mismatch', label: 'Name Mismatch' },
  { value: 'missing_data', label: 'Missing Data' },
]

export default function IssueTable({ issues }: IssueTableProps) {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (severityFilter !== 'all' && issue.severity !== severityFilter) return false
      if (typeFilter !== 'all' && issue.issue_type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          issue.affected_name?.toLowerCase().includes(q) ||
          issue.description?.toLowerCase().includes(q) ||
          issue.affected_email?.toLowerCase().includes(q) ||
          issue.affected_ni_number?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [issues, severityFilter, typeFilter, search])

  function downloadCSV() {
    const headers = ['Severity', 'Type', 'Affected Name', 'Email', 'NI Number', 'Description', 'Financial Impact (£/mo)']
    const rows = filtered.map((i) => [
      i.severity,
      i.issue_type,
      i.affected_name,
      i.affected_email ?? '',
      i.affected_ni_number ?? '',
      `"${i.description.replace(/"/g, '""')}"`,
      i.financial_impact?.toFixed(2) ?? '',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'syncledger-issues.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, NI…"
          className="input-base max-w-xs text-xs"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as IssueSeverity | 'all')}
          className="input-base w-auto text-xs"
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as IssueType | 'all')}
          className="input-base w-auto text-xs"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">{filtered.length} issues</span>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No issues match your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Affected</th>
                  <th className="px-4 py-3 max-w-xs">Description</th>
                  <th className="px-4 py-3 text-right">Est. cost/mo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((issue, i) => {
                  const rowId = issue.id ?? String(i)
                  const isExpanded = expandedId === rowId
                  return (
                    <>
                      <tr
                        key={rowId}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : rowId)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <SeverityBadge severity={issue.severity} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <IssueTypeBadge type={issue.issue_type} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{issue.affected_name}</p>
                          {issue.affected_email && (
                            <p className="text-xs text-gray-400">{issue.affected_email}</p>
                          )}
                          {issue.affected_ni_number && (
                            <p className="text-xs text-gray-400 font-mono">{issue.affected_ni_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                            {issue.description}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {issue.financial_impact
                            ? <span className="font-semibold text-amber-700">{formatCurrency(issue.financial_impact)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${rowId}-detail`} className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{issue.description}</p>
                            {issue.details && Object.keys(issue.details).length > 0 && (
                              <details className="text-xs">
                                <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
                                  Raw details
                                </summary>
                                <pre className="mt-2 bg-white border border-gray-200 rounded p-3 text-gray-500 overflow-x-auto text-xs">
                                  {JSON.stringify(issue.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
