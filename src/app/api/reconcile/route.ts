import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runReconciliation } from '@/lib/reconciliation/engine'
import type { ReconcileRequest } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body: ReconcileRequest = await request.json()
    const { name, payroll, benefits } = body

    if (!payroll?.length || !benefits?.length) {
      return NextResponse.json(
        { error: 'Both payroll and benefits arrays are required.' },
        { status: 400 }
      )
    }

    // Run the reconciliation engine (pure TypeScript — no DB dependency)
    const { issues, totalIssues, criticalIssues, warningIssues, estimatedMonthlyLeakage } =
      runReconciliation(payroll, benefits)

    // Persist the reconciliation run
    const { data: run, error: runError } = await supabase
      .from('reconciliation_runs')
      .insert({
        user_id: user.id,
        name: name || `Run ${new Date().toLocaleDateString('en-GB')}`,
        status: 'complete',
        total_issues: totalIssues,
        critical_issues: criticalIssues,
        warning_issues: warningIssues,
        estimated_monthly_leakage: estimatedMonthlyLeakage,
        payroll_row_count: payroll.length,
        benefits_row_count: benefits.length,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (runError || !run) {
      console.error('Failed to insert reconciliation run:', runError)
      return NextResponse.json({ error: 'Failed to save reconciliation run.' }, { status: 500 })
    }

    // Persist all issues (batch insert)
    if (issues.length > 0) {
      const issueRows = issues.map((issue) => ({
        run_id: run.id,
        user_id: user.id,
        issue_type: issue.issue_type,
        severity: issue.severity,
        affected_name: issue.affected_name,
        affected_email: issue.affected_email ?? null,
        affected_ni_number: issue.affected_ni_number ?? null,
        description: issue.description,
        financial_impact: issue.financial_impact ?? null,
        details: issue.details,
        status: 'open',
      }))

      const { error: issuesError } = await supabase
        .from('reconciliation_issues')
        .insert(issueRows)

      if (issuesError) {
        console.error('Failed to insert issues:', issuesError)
        // Don't fail the whole request — run was created, issues just didn't save
      }
    }

    return NextResponse.json({
      runId: run.id,
      totalIssues,
      criticalIssues,
      estimatedMonthlyLeakage,
    })
  } catch (err) {
    console.error('Reconcile API error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
