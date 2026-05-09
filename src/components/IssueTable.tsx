'use client'

import { useState, useMemo } from 'react'
import { SeverityBadge, IssueTypeBadge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { ReconciliationIssue, IssueSeverity, IssueType } from '@/types'

interface IssueTableProps {
  issues: ReconciliationIssue[]
  providers: string[]
  departments: string[]
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

function ConfidencePill({ confidence }: { confidence?: number | null }) {
  if (confidence === undefined || confidence === null) return <span className="text-gray-300">—</span>
  const pct = Math.round(confidence * 100)
  const style: React.CSSProperties =
    pct >= 90 ? { backgroundColor: '#dcfce7', color: '#15803d' } :
    pct >= 70 ? { backgroundColor: '#fef3c7', color: '#b45309' } :
    pct === 0 ? { backgroundColor: '#fee2e2', color: '#b91c1c' } :
    { backgroundColor: '#D0E6FD', color: '#162660' }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style={style}>
      {pct === 0 ? 'No match' : `${pct}%`}
    </span>
  )
}

export default function IssueTable({ issues, providers, departments }: IssueTableProps) {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (severityFilter !== 'all' && issue.severity !== severityFilter) return false
      if (typeFilter !== 'all' && issue.issue_type !== typeFilter) return false
      if (providerFilter !== 'all' && issue.provider !== providerFilter) return false
      if (deptFilter !== 'all' && issue.department !== deptFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          issue.affected_name?.toLowerCase().includes(q) ||
          issue.description?.toLowerCase().includes(q) ||
          issue.affected_email?.toLowerCase().includes(q) ||
          issue.affected_ni_number?.toLowerCase().includes(q) ||
          issue.provider?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [issues, severityFilter, typeFilter, providerFilter, deptFilter, search])

  function downloadCSV() {
    const headers = ['Severity', 'Type', 'Name', 'Email', 'NI Number', 'Provider', 'Department', 'Description', 'Cost/mo (£)', 'Confidence']
    const rows = filtered.map((i) => [
      i.severity, i.issue_type, i.affected_name,
      i.affected_email ?? '', i.affected_ni_number ?? '',
      i.provider ?? '', i.department ?? '',
      `"${i.description.replace(/"/g, '""')}"`,
      i.financial_impact?.toFixed(2) ?? '',
      i.match_confidence !== undefined && i.match_confidence !== null
        ? `${Math.round(i.match_confidence * 100)}%` : '',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'slex-issues.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, NI…"
          className="input-base text-xs max-w-[200px]"
        />
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as IssueSeverity | 'all')} className="input-base w-auto text-xs">
          {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as IssueType | 'all')} className="input-base w-auto text-xs">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {providers.length > 0 && (
          <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="input-base w-auto text-xs">
            <option value="all">All providers</option>
            {providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {departments.length > 0 && (
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-base w-auto text-xs">
            <option value="all">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">{filtered.length} of {issues.length}</span>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">No issues match your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs font-medium text-gray-500 border-b border-gray-200"
                  style={{ backgroundColor: '#faf8f5' }}
                >
                  <th className="px-4 py-3 whitespace-nowrap">Severity</th>
                  <th className="px-4 py-3 whitespace-nowrap">Type</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 max-w-[280px]">Description</th>
                  <th className="px-4 py-3 whitespace-nowrap">Provider</th>
                  <th className="px-4 py-3 whitespace-nowrap">Dept</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Cost/mo</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Confidence</th>
                  <th className="px-4 py-3 w-6"></th>
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
                        onClick={() => setExpandedId(isExpanded ? null : rowId)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <SeverityBadge severity={issue.severity} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <IssueTypeBadge type={issue.issue_type} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium whitespace-nowrap" style={{ color: '#162660' }}>
                            {issue.affected_name}
                          </p>
                          {issue.affected_email && (
                            <p className="text-xs text-gray-400 truncate max-w-[160px]">{issue.affected_email}</p>
                          )}
                          {issue.affected_ni_number && (
                            <p className="text-xs text-gray-400 font-mono">{issue.affected_ni_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{issue.description}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {issue.provider ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {issue.department ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {issue.financial_impact
                            ? <span className="font-semibold text-amber-700">{formatCurrency(issue.financial_impact)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ConfidencePill confidence={issue.match_confidence} />
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
                        <tr key={`${rowId}-detail`}>
                          <td
                            colSpan={9}
                            className="px-4 py-4"
                            style={{ backgroundColor: '#D0E6FD18' }}
                          >
                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{issue.description}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                              {issue.match_confidence !== undefined && issue.match_confidence !== null && (
                                <span>
                                  <strong style={{ color: '#162660' }}>Match confidence:</strong>{' '}
                                  {Math.round(issue.match_confidence * 100)}%
                                  {issue.match_confidence < 0.7 && (
                                    <span className="ml-1 text-amber-600">— manual verification recommended</span>
                                  )}
                                </span>
                              )}
                              {issue.provider && (
                                <span><strong style={{ color: '#162660' }}>Provider:</strong> {issue.provider}</span>
                              )}
                              {issue.department && (
                                <span><strong style={{ color: '#162660' }}>Department:</strong> {issue.department}</span>
                              )}
                            </div>
                            {issue.details && Object.keys(issue.details).length > 0 && (
                              <details className="text-xs">
                                <summary className="text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                                  Raw match data
                                </summary>
                                <pre className="mt-2 bg-white border border-gray-100 rounded p-3 text-gray-500 overflow-x-auto">
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
