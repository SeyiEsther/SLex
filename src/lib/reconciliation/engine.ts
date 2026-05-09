import Fuse from 'fuse.js'
import type { BenefitRecord, PayrollRecord, ReconciliationIssue } from '@/types'

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Tries to find a payroll record that matches a benefit record.
 * Matching priority: NI number → email → payroll ID → fuzzy name
 * Returns { match, matchedBy } or null.
 */
function findPayrollMatch(
  benefit: BenefitRecord,
  payroll: PayrollRecord[]
): { record: PayrollRecord; matchedBy: string } | null {
  // 1. NI number (most reliable)
  if (benefit.ni_number) {
    const match = payroll.find(
      (p) => p.ni_number && p.ni_number.toUpperCase() === benefit.ni_number!.toUpperCase()
    )
    if (match) return { record: match, matchedBy: 'ni_number' }
  }

  // 2. Email
  if (benefit.email) {
    const match = payroll.find(
      (p) => p.email && p.email.toLowerCase() === benefit.email!.toLowerCase()
    )
    if (match) return { record: match, matchedBy: 'email' }
  }

  // 3. Payroll ID
  if (benefit.payroll_id) {
    const match = payroll.find(
      (p) => p.payroll_id && p.payroll_id === benefit.payroll_id
    )
    if (match) return { record: match, matchedBy: 'payroll_id' }
  }

  // 4. Fuzzy name (last resort — threshold 0.35 = fairly strict)
  const fuse = new Fuse(payroll, {
    keys: ['name'],
    includeScore: true,
    threshold: 0.35,
  })
  const results = fuse.search(benefit.name)
  if (results.length > 0) {
    return { record: results[0].item, matchedBy: 'fuzzy_name' }
  }

  return null
}

// ─── Individual checks ────────────────────────────────────────────────────────

function detectGhostEmployees(
  benefits: BenefitRecord[],
  payroll: PayrollRecord[]
): ReconciliationIssue[] {
  return benefits
    .filter((b) => findPayrollMatch(b, payroll) === null)
    .map((b) => ({
      issue_type: 'ghost_employee' as const,
      severity: 'critical' as const,
      affected_name: b.name,
      affected_email: b.email,
      affected_ni_number: b.ni_number,
      description:
        `${b.name} appears in the ${b.provider ?? 'benefits'} invoice but has no matching ` +
        `payroll record. They may have left the company — you are still being charged ` +
        `£${b.monthly_cost.toFixed(2)}/month.`,
      financial_impact: b.monthly_cost,
      details: { benefit_record: b },
    }))
}

function detectMissingDeductions(
  benefits: BenefitRecord[],
  payroll: PayrollRecord[]
): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []

  for (const b of benefits) {
    const result = findPayrollMatch(b, payroll)
    if (!result) continue // already flagged as ghost employee

    const deduction = result.record.benefit_deduction ?? 0
    if (deduction === 0) {
      issues.push({
        issue_type: 'missing_deduction',
        severity: 'warning',
        affected_name: b.name,
        affected_email: b.email,
        affected_ni_number: b.ni_number,
        description:
          `${b.name} has a ${b.benefit_type ?? 'benefit'} worth £${b.monthly_cost.toFixed(2)}/month ` +
          `with ${b.provider ?? 'the provider'} but no payroll deduction is recorded. ` +
          `The company may be absorbing the full cost unreported.`,
        financial_impact: b.monthly_cost,
        details: { benefit_record: b, payroll_record: result.record },
      })
    }
  }

  return issues
}

function detectDuplicateBilling(benefits: BenefitRecord[]): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []
  const seen = new Map<string, BenefitRecord[]>()

  for (const b of benefits) {
    // Group by best available identifier
    const key =
      (b.ni_number ?? b.email ?? b.payroll_id ?? b.name).toLowerCase().trim()
    const group = seen.get(key) ?? []
    group.push(b)
    seen.set(key, group)
  }

  seen.forEach((records) => {
    if (records.length <= 1) return

    const totalCost = records.reduce((s: number, r: BenefitRecord) => s + r.monthly_cost, 0)
    const minCost = Math.min(...records.map((r: BenefitRecord) => r.monthly_cost))
    const waste = totalCost - minCost

    issues.push({
      issue_type: 'duplicate_billing',
      severity: 'critical',
      affected_name: records[0].name,
      affected_email: records[0].email,
      affected_ni_number: records[0].ni_number,
      description:
        `${records[0].name} appears ${records.length} times in the benefits invoice ` +
        `(total £${totalCost.toFixed(2)}/month). Estimated duplicate charge: £${waste.toFixed(2)}/month.`,
      financial_impact: waste,
      details: { records },
    })
  })

  return issues
}

function detectNameMismatches(
  benefits: BenefitRecord[],
  payroll: PayrollRecord[]
): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []

  // Only flag name mismatches when there is NO hard-identifier match,
  // but there IS a reasonably close fuzzy name match.
  for (const b of benefits) {
    const hardMatch = payroll.find(
      (p) =>
        (b.ni_number && p.ni_number && b.ni_number.toUpperCase() === p.ni_number.toUpperCase()) ||
        (b.email && p.email && b.email.toLowerCase() === p.email.toLowerCase()) ||
        (b.payroll_id && p.payroll_id && b.payroll_id === p.payroll_id)
    )

    if (hardMatch) continue // identifiers match — name difference is cosmetic

    // Check if there's no hard match but a fuzzy name match exists
    const fuse = new Fuse(payroll, {
      keys: ['name'],
      includeScore: true,
      threshold: 0.4,
    })
    const results = fuse.search(b.name)

    // Score between 0.05 and 0.4 = fuzzy match (not exact)
    if (results.length > 0 && results[0].score !== undefined && results[0].score > 0.05) {
      const closest = results[0].item
      issues.push({
        issue_type: 'name_mismatch',
        severity: 'warning',
        affected_name: b.name,
        affected_email: b.email,
        affected_ni_number: b.ni_number,
        description:
          `"${b.name}" in the benefits file closely resembles "${closest.name}" in payroll ` +
          `but the names don't match exactly. This could be a typo, nickname, or a different person. ` +
          `Verify manually.`,
        financial_impact: undefined,
        details: {
          benefit_name: b.name,
          payroll_name: closest.name,
          match_score: results[0].score,
        },
      })
    }
  }

  return issues
}

function detectMissingData(payroll: PayrollRecord[]): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []

  for (const p of payroll) {
    if (!p.ni_number) {
      issues.push({
        issue_type: 'missing_data',
        severity: 'warning',
        affected_name: p.name,
        affected_email: p.email,
        description:
          `${p.name} is missing a National Insurance number in the payroll data. ` +
          `This reduces matching accuracy and is required for HMRC reporting.`,
        details: { record: p, missing_field: 'ni_number' },
      })
    }

    if (!p.payroll_id) {
      issues.push({
        issue_type: 'missing_data',
        severity: 'info',
        affected_name: p.name,
        affected_email: p.email,
        description:
          `${p.name} is missing a Payroll ID. Without this, matching relies on name and email only.`,
        details: { record: p, missing_field: 'payroll_id' },
      })
    }
  }

  return issues
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export interface ReconciliationSummary {
  issues: ReconciliationIssue[]
  totalIssues: number
  criticalIssues: number
  warningIssues: number
  infoIssues: number
  estimatedMonthlyLeakage: number
}

export function runReconciliation(
  payroll: PayrollRecord[],
  benefits: BenefitRecord[]
): ReconciliationSummary {
  const ghostEmployees = detectGhostEmployees(benefits, payroll)
  const missingDeductions = detectMissingDeductions(benefits, payroll)
  const duplicates = detectDuplicateBilling(benefits)
  const nameMismatches = detectNameMismatches(benefits, payroll)
  const missingData = detectMissingData(payroll)

  const issues: ReconciliationIssue[] = [
    ...ghostEmployees,
    ...duplicates,      // critical first
    ...missingDeductions,
    ...nameMismatches,
    ...missingData,
  ]

  const criticalIssues = issues.filter((i) => i.severity === 'critical').length
  const warningIssues = issues.filter((i) => i.severity === 'warning').length
  const infoIssues = issues.filter((i) => i.severity === 'info').length
  const estimatedMonthlyLeakage = issues.reduce((sum, i) => sum + (i.financial_impact ?? 0), 0)

  return {
    issues,
    totalIssues: issues.length,
    criticalIssues,
    warningIssues,
    infoIssues,
    estimatedMonthlyLeakage,
  }
}
