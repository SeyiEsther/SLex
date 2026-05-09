'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FileUpload from '@/components/FileUpload'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { parsePayrollCSV, parseBenefitsCSV } from '@/lib/csv/parser'
import type { PayrollRecord, BenefitRecord } from '@/types'

interface ParsedFile<T> {
  fileName: string
  records: T[]
  errors: string[]
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                  {cell || <span className="text-gray-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function recordsToPreview(records: object[], maxRows = 5) {
  if (records.length === 0) return { headers: [], rows: [] }
  const first = records[0] as Record<string, unknown>
  const headers = Object.keys(first).filter((k) => first[k] !== undefined)
  const rows = records.slice(0, maxRows).map((r) => {
    const obj = r as Record<string, unknown>
    return headers.map((h) => String(obj[h] ?? ''))
  })
  return { headers, rows }
}

export default function UploadPage() {
  const router = useRouter()

  const [runName, setRunName] = useState('')
  const [payroll, setPayroll] = useState<ParsedFile<PayrollRecord> | null>(null)
  const [benefits, setBenefits] = useState<ParsedFile<BenefitRecord> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handlePayrollFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { records, errors } = parsePayrollCSV(text)
      setPayroll({ fileName: file.name, records, errors })
    }
    reader.readAsText(file)
  }

  function handleBenefitsFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { records, errors } = parseBenefitsCSV(text)
      setBenefits({ fileName: file.name, records, errors })
    }
    reader.readAsText(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!payroll || !benefits) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: runName || `Run ${new Date().toLocaleDateString('en-GB')}`,
          payroll: payroll.records,
          benefits: benefits.records,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Reconciliation failed')
      }

      const { runId } = await res.json()
      router.push(`/results/${runId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const canSubmit = !!payroll && !!benefits && payroll.records.length > 0 && benefits.records.length > 0
  const payrollPreview = payroll ? recordsToPreview(payroll.records) : null
  const benefitsPreview = benefits ? recordsToPreview(benefits.records) : null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Reconciliation Run</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your payroll export and benefits invoice to detect mismatches automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Run name */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Run Details</h2>
          </CardHeader>
          <CardBody>
            <label htmlFor="runName" className="label-base">
              Run name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="runName"
              type="text"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              className="input-base max-w-sm"
              placeholder="e.g. April 2025 — BUPA reconciliation"
            />
          </CardBody>
        </Card>

        {/* Upload zone */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Upload Files</h2>
            <p className="text-xs text-gray-400 mt-0.5">Both files are required to run reconciliation</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Payroll Export
                </p>
                <FileUpload
                  label="Upload payroll.csv"
                  description="Export from your payroll system (Sage, Xero, etc.)"
                  onFile={handlePayrollFile}
                  fileName={payroll?.fileName}
                  rowCount={payroll?.records.length}
                  hasError={payroll ? payroll.errors.length > 0 : false}
                />
                {payroll?.errors && payroll.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {payroll.errors.slice(0, 3).map((e, i) => (
                      <li key={i} className="text-xs text-amber-600">⚠ {e}</li>
                    ))}
                    {payroll.errors.length > 3 && (
                      <li className="text-xs text-gray-400">+{payroll.errors.length - 3} more warnings</li>
                    )}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Benefits Invoice
                </p>
                <FileUpload
                  label="Upload benefits.csv"
                  description="Invoice from BUPA, Vitality, LeasePlan, etc."
                  onFile={handleBenefitsFile}
                  fileName={benefits?.fileName}
                  rowCount={benefits?.records.length}
                  hasError={benefits ? benefits.errors.length > 0 : false}
                />
                {benefits?.errors && benefits.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {benefits.errors.slice(0, 3).map((e, i) => (
                      <li key={i} className="text-xs text-amber-600">⚠ {e}</li>
                    ))}
                    {benefits.errors.length > 3 && (
                      <li className="text-xs text-gray-400">+{benefits.errors.length - 3} more warnings</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* CSV format hint */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              <strong>Supported columns:</strong> Name, Email, NI Number, Payroll ID, Department, Gross Pay, Benefit Deduction (payroll) · Provider, Benefit Type, Monthly Cost (benefits). Column names are matched flexibly.
            </div>
          </CardBody>
        </Card>

        {/* Previews */}
        {payrollPreview && payrollPreview.headers.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-900">
                Payroll Preview{' '}
                <span className="text-gray-400 font-normal text-xs">
                  (first 5 rows of {payroll?.records.length})
                </span>
              </h2>
            </CardHeader>
            <CardBody>
              <PreviewTable headers={payrollPreview.headers} rows={payrollPreview.rows} />
            </CardBody>
          </Card>
        )}

        {benefitsPreview && benefitsPreview.headers.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-900">
                Benefits Preview{' '}
                <span className="text-gray-400 font-normal text-xs">
                  (first 5 rows of {benefits?.records.length})
                </span>
              </h2>
            </CardHeader>
            <CardBody>
              <PreviewTable headers={benefitsPreview.headers} rows={benefitsPreview.rows} />
            </CardBody>
          </Card>
        )}

        {submitError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            {!canSubmit
              ? 'Upload both CSV files to continue'
              : `Ready — ${payroll?.records.length} payroll records · ${benefits?.records.length} benefit records`}
          </p>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Running reconciliation…
              </>
            ) : (
              'Run reconciliation →'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
