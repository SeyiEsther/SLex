import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runReconciliation } from '@/lib/reconciliation/engine'
import type { ReconcileRequest } from '@/types'

// Supabase batch insert limit
const CHUNK_SIZE = 500

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body: ReconcileRequest = await request.json()
    const {
      name,
      payroll,
      benefits,
      payrollFilename,
      benefitsFilename,
      payrollStoragePath,
      benefitsStoragePath,
    } = body

    if (!payroll?.length || !benefits?.length) {
      return NextResponse.json(
        { error: 'Both payroll and benefits arrays are required.' },
        { status: 400 }
      )
    }

    // ── 1. Run the reconciliation engine ─────────────────────────────────────
    const {
      issues,
      totalIssues,
      criticalIssues,
      warningIssues,
      ghostEmployees,
      estimatedMonthlyLeakage,
    } = runReconciliation(payroll, benefits)

    // ── 2. Create the reconciliation run ─────────────────────────────────────
    const { data: run, error: runError } = await supabase
      .from('reconciliation_runs')
      .insert({
        user_id: user.id,
        name: name || `Run ${new Date().toLocaleDateString('en-GB')}`,
        status: 'complete',
        total_issues: totalIssues,
        critical_issues: criticalIssues,
        warning_issues: warningIssues,
        ghost_employees: ghostEmployees,
        estimated_monthly_leakage: estimatedMonthlyLeakage,
        payroll_row_count: payroll.length,
        benefits_row_count: benefits.length,
        payroll_filename: payrollFilename ?? null,
        benefits_filename: benefitsFilename ?? null,
        payroll_storage_path: payrollStoragePath ?? null,
        benefits_storage_path: benefitsStoragePath ?? null,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (runError || !run) {
      console.error('Failed to insert run:', runError)
      return NextResponse.json({ error: 'Failed to save reconciliation run.' }, { status: 500 })
    }

    const runId = run.id

    // ── 3. Save uploaded_files metadata ───────────────────────────────────────
    const fileRows = []
    if (payrollFilename) {
      fileRows.push({
        user_id: user.id,
        run_id: runId,
        file_type: 'payroll',
        filename: payrollFilename,
        storage_path: payrollStoragePath ?? null,
        row_count: payroll.length,
      })
    }
    if (benefitsFilename) {
      fileRows.push({
        user_id: user.id,
        run_id: runId,
        file_type: 'benefits',
        filename: benefitsFilename,
        storage_path: benefitsStoragePath ?? null,
        row_count: benefits.length,
      })
    }
    if (fileRows.length > 0) {
      await supabase.from('uploaded_files').insert(fileRows)
    }

    // ── 4. Save payroll records ────────────────────────────────────────────────
    const payrollRows = payroll.map((p) => ({
      run_id: runId,
      user_id: user.id,
      name: p.name,
      email: p.email ?? null,
      ni_number: p.ni_number ?? null,
      payroll_id: p.payroll_id ?? null,
      department: p.department ?? null,
      gross_pay: p.gross_pay ?? null,
      benefit_deduction: p.benefit_deduction ?? null,
    }))

    for (const batch of chunk(payrollRows, CHUNK_SIZE)) {
      const { error } = await supabase.from('payroll_records').insert(batch)
      if (error) console.error('payroll_records insert error:', error)
    }

    // ── 5. Save provider records ──────────────────────────────────────────────
    const providerRows = benefits.map((b) => ({
      run_id: runId,
      user_id: user.id,
      name: b.name,
      email: b.email ?? null,
      ni_number: b.ni_number ?? null,
      payroll_id: b.payroll_id ?? null,
      provider_member_id: b.provider_member_id ?? null,
      provider: b.provider ?? null,
      benefit_type: b.benefit_type ?? null,
      monthly_cost: b.monthly_cost,
    }))

    for (const batch of chunk(providerRows, CHUNK_SIZE)) {
      const { error } = await supabase.from('provider_records').insert(batch)
      if (error) console.error('provider_records insert error:', error)
    }

    // ── 6. Save issues ────────────────────────────────────────────────────────
    if (issues.length > 0) {
      const issueRows = issues.map((issue) => ({
        run_id: runId,
        user_id: user.id,
        issue_type: issue.issue_type,
        severity: issue.severity,
        affected_name: issue.affected_name,
        affected_email: issue.affected_email ?? null,
        affected_ni_number: issue.affected_ni_number ?? null,
        description: issue.description,
        financial_impact: issue.financial_impact ?? null,
        match_confidence: issue.match_confidence ?? null,
        provider: issue.provider ?? null,
        department: issue.department ?? null,
        details: issue.details,
        status: 'open',
      }))

      for (const batch of chunk(issueRows, CHUNK_SIZE)) {
        const { error } = await supabase.from('reconciliation_issues').insert(batch)
        if (error) console.error('issues insert error:', error)
      }
    }

    return NextResponse.json({
      runId,
      totalIssues,
      criticalIssues,
      ghostEmployees,
      estimatedMonthlyLeakage,
    })
  } catch (err) {
    console.error('Reconcile API error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
