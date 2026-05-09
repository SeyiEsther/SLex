'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import FileUpload from '@/components/FileUpload'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { parsePayrollCSV, parseBenefitsCSV } from '@/lib/csv/parser'
import { validatePayroll, validateBenefits, type ValidationResult } from '@/lib/csv/validate'
import { createClient } from '@/lib/supabase/client'
import type { PayrollRecord, BenefitRecord } from '@/types'

// ─── Upload progress helpers ─────────────────────────────────────────────────

interface ProgressState {
  phase: 'idle' | 'uploading_payroll' | 'uploading_benefits' | 'reconciling' | 'done'
  pct: number
  label: string
}

function useAnimatedProgress(active: boolean, targetPct: number) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    if (!active) { setDisplayed(0); return }
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        if (prev >= targetPct) return prev
        return Math.min(prev + Math.random() * 4 + 1, targetPct)
      })
    }, 80)
    return () => clearInterval(interval)
  }, [active, targetPct])
  return Math.round(displayed)
}

// ─── CSV validation summary ───────────────────────────────────────────────────

function ValidationSummary({ result, type }: { result: ValidationResult; type: 'payroll' | 'benefits' }) {
  const hasErrors = result.missingRequiredColumns.length > 0
  return (
    <div className={`mt-3 rounded-lg border px-4 py-3 text-xs space-y-1 ${hasErrors ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      {hasErrors ? (
        <p className="text-red-700 font-medium">
          ✗ Missing required columns: {result.missingRequiredColumns.join(', ')}
        </p>
      ) : (
        <p className="text-green-700 font-medium">✓ Required columns found</p>
      )}
      {result.missingOptionalColumns.length > 0 && (
        <p className="text-gray-500">
          Optional columns not found: {result.missingOptionalColumns.join(', ')}
        </p>
      )}
      {result.warnings.map((w, i) => (
        <p key={i} className="text-amber-700">⚠ {w}</p>
      ))}
    </div>
  )
}

// ─── Preview table ────────────────────────────────────────────────────────────

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
                <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[140px] truncate">
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedFile<T> {
  file: File
  records: T[]
  errors: string[]
  rawHeaders: string[]
  validation: ValidationResult
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const [runName, setRunName] = useState('')
  const [payroll, setPayroll] = useState<ParsedFile<PayrollRecord> | null>(null)
  const [benefits, setBenefits] = useState<ParsedFile<BenefitRecord> | null>(null)

  const [progress, setProgress] = useState<ProgressState>({ phase: 'idle', pct: 0, label: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isUploading = progress.phase !== 'idle' && progress.phase !== 'done'
  const animatedPct = useAnimatedProgress(isUploading, progress.pct)

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  async function handlePayrollFile(file: File) {
    const text = await readFile(file)
    const { records, errors, rawHeaders } = parsePayrollCSV(text)
    const validation = validatePayroll(records, rawHeaders)
    setPayroll({ file, records, errors, rawHeaders, validation })
  }

  async function handleBenefitsFile(file: File) {
    const text = await readFile(file)
    const { records, errors, rawHeaders } = parseBenefitsCSV(text)
    const validation = validateBenefits(records, rawHeaders)
    setBenefits({ file, records, errors, rawHeaders, validation })
  }

  async function uploadToStorage(
    file: File,
    fileType: 'payroll' | 'benefits',
    userId: string
  ): Promise<string | null> {
    const supabase = createClient()
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${userId}/${timestamp}/${fileType}-${safeName}`

    const { error } = await supabase.storage
      .from('reconciliation-files')
      .upload(path, file, { upsert: false })

    if (error) {
      // Storage might not be configured — non-fatal, we still have the parsed data
      console.warn('Storage upload failed (non-fatal):', error.message)
      return null
    }
    return path
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!payroll || !benefits) return

    setSubmitError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // ── Step 1: upload payroll to Storage ────────────────────────────────
      setProgress({ phase: 'uploading_payroll', pct: 40, label: 'Uploading payroll file…' })
      const payrollPath = await uploadToStorage(payroll.file, 'payroll', user.id)

      // ── Step 2: upload benefits to Storage ───────────────────────────────
      setProgress({ phase: 'uploading_benefits', pct: 75, label: 'Uploading benefits file…' })
      const benefitsPath = await uploadToStorage(benefits.file, 'benefits', user.id)

      // ── Step 3: run reconciliation ────────────────────────────────────────
      setProgress({ phase: 'reconciling', pct: 95, label: 'Running reconciliation…' })

      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: runName || `Run ${new Date().toLocaleDateString('en-GB')}`,
          payroll: payroll.records,
          benefits: benefits.records,
          payrollFilename: payroll.file.name,
          benefitsFilename: benefits.file.name,
          payrollStoragePath: payrollPath,
          benefitsStoragePath: benefitsPath,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Reconciliation failed')
      }

      setProgress({ phase: 'done', pct: 100, label: 'Complete!' })
      const { runId } = await res.json()
      router.push(`/results/${runId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
      setProgress({ phase: 'idle', pct: 0, label: '' })
    }
  }

  const canSubmit =
    !!payroll &&
    !!benefits &&
    payroll.records.length > 0 &&
    benefits.records.length > 0 &&
    payroll.validation.missingRequiredColumns.length === 0 &&
    benefits.validation.missingRequiredColumns.length === 0

  const payrollPreview = payroll ? recordsToPreview(payroll.records) : null
  const benefitsPreview = benefits ? recordsToPreview(benefits.records) : null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Reconciliation Run</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your payroll export and benefits invoice. SLex detects mismatches automatically.
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
            <p className="text-xs text-gray-400 mt-0.5">Both files are required</p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Payroll */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Payroll Export
                </p>
                <FileUpload
                  label="Upload payroll.csv"
                  description="Sage, Xero, ADP, or any payroll export"
                  onFile={handlePayrollFile}
                  fileName={payroll?.file.name}
                  rowCount={payroll?.records.length}
                  hasError={payroll ? payroll.validation.missingRequiredColumns.length > 0 : false}
                />
                {payroll && (
                  <ValidationSummary result={payroll.validation} type="payroll" />
                )}
                {payroll?.errors && payroll.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {payroll.errors.slice(0, 2).map((e, i) => (
                      <li key={i} className="text-xs text-amber-600">⚠ {e}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Benefits */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Benefits Invoice
                </p>
                <FileUpload
                  label="Upload benefits.csv"
                  description="BUPA, Vitality, LeasePlan, etc."
                  onFile={handleBenefitsFile}
                  fileName={benefits?.file.name}
                  rowCount={benefits?.records.length}
                  hasError={benefits ? benefits.validation.missingRequiredColumns.length > 0 : false}
                />
                {benefits && (
                  <ValidationSummary result={benefits.validation} type="benefits" />
                )}
                {benefits?.errors && benefits.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {benefits.errors.slice(0, 2).map((e, i) => (
                      <li key={i} className="text-xs text-amber-600">⚠ {e}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Accepted columns hint */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              <strong>Payroll columns:</strong> Name, Email, NI Number, Payroll ID, Department, Gross Pay, Benefit Deduction
              <span className="mx-2 text-blue-300">·</span>
              <strong>Benefits columns:</strong> Name, Email, NI Number, Payroll ID, Provider Member ID, Provider, Benefit Type, Monthly Cost
            </div>
          </CardBody>
        </Card>

        {/* Previews */}
        {payrollPreview && payrollPreview.headers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Payroll Preview</h2>
                <span className="text-xs text-gray-400">
                  {payroll?.records.length} rows
                  {payroll && payroll.validation.duplicateCount > 0 && (
                    <span className="ml-2 text-amber-600">
                      · {payroll.validation.duplicateCount} duplicate{payroll.validation.duplicateCount > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <PreviewTable headers={payrollPreview.headers} rows={payrollPreview.rows} />
              {(payroll?.records.length ?? 0) > 5 && (
                <p className="text-xs text-gray-400 mt-2">
                  Showing 5 of {payroll?.records.length} rows
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {benefitsPreview && benefitsPreview.headers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Benefits Preview</h2>
                <span className="text-xs text-gray-400">
                  {benefits?.records.length} rows
                  {benefits && benefits.validation.duplicateCount > 0 && (
                    <span className="ml-2 text-amber-600">
                      · {benefits.validation.duplicateCount} duplicate{benefits.validation.duplicateCount > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <PreviewTable headers={benefitsPreview.headers} rows={benefitsPreview.rows} />
              {(benefits?.records.length ?? 0) > 5 && (
                <p className="text-xs text-gray-400 mt-2">
                  Showing 5 of {benefits?.records.length} rows
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {/* Upload progress bar */}
        {isUploading && (
          <Card>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{progress.label}</span>
                  <span className="text-gray-500 text-xs tabular-nums">{animatedPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-150"
                    style={{ width: `${animatedPct}%` }}
                  />
                </div>
                <div className="flex gap-6 text-xs text-gray-400">
                  <span className={progress.phase === 'uploading_payroll' ? 'text-indigo-600 font-medium' : ''}>
                    1. Upload payroll
                  </span>
                  <span className={progress.phase === 'uploading_benefits' ? 'text-indigo-600 font-medium' : ''}>
                    2. Upload benefits
                  </span>
                  <span className={progress.phase === 'reconciling' ? 'text-indigo-600 font-medium' : ''}>
                    3. Run reconciliation
                  </span>
                </div>
              </div>
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
            {!canSubmit && !payroll && !benefits
              ? 'Upload both CSV files to continue'
              : !canSubmit
              ? 'Fix validation errors to continue'
              : `Ready — ${payroll?.records.length} payroll · ${benefits?.records.length} benefit records`}
          </p>
          <button
            type="submit"
            disabled={!canSubmit || isUploading}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {progress.label}
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
