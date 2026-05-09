import Fuse from 'fuse.js'
import type { BenefitRecord, PayrollRecord, ReconciliationIssue } from '@/types'

// ─── Matching ─────────────────────────────────────────────────────────────────

interface MatchResult {
  record: PayrollRecord
  matchedBy: 'ni_number' | 'email' | 'payroll_id' | 'fuzzy_name'
  confidence: number
}

/**
 * Returns the best payroll match for a benefit record, or null if none found.
 * Confidence: 1.0 = certain (NI/email/ID match), 0.5–0.85 = fuzzy name.
 */
function findPayrollMatch(benefit: BenefitRecord, payroll: PayrollRecord[]): MatchResult | null {
  // 1. NI number (most reliable identifier)
  if (benefit.ni_number) {
    const match = payroll.find(
      (p) => p.ni_number && p.ni_number.toUpperCase() === benefit.ni_number!.toUpperCase()
    )
    if (match) return { record: match, matchedBy: 'ni_number', confidence: 1.0 }
  }

  // 2. Email
  if (benefit.email) {
    const match = payroll.find(
      (p) => p.email && p.email.toLowerCase() === benefit.email!.toLowerCase()
    )
    if (match) return { record: match, matchedBy: 'email', confidence: 0.95 }
  }

  // 3. Payroll ID
  if (benefit.payroll_id) {
    const match = payroll.find((p) => p.payroll_id && p.payroll_id === benefit.payroll_id)
    if (match) return { record: match, matchedBy: 'payroll_id', confidence: 0.9 }
  }

  // 4. Fuzzy name (threshold 0.35 = fairly strict similarity)
  const fuse = new Fuse(payroll, { keys: ['name'], includeScore: true, threshold: 0.35 })
  const results = fuse.search(benefit.name)
  if (results.length > 0 && results[0].score !== undefined) {
    // Fuse score 0 = perfect, 1 = no match. Convert to our confidence scale.
    const confidence = Math.round((1 - results[0].score) * 100) / 100
    return { record: results[0].item, matchedBy: 'fuzzy_name', confidence }
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
        `payroll record. They may have left — you are still being charged ` +
        `£${b.monthly_cost.toFixed(2)}/month.`,
      financial_impact: b.monthly_cost,
      match_confidence: 0,
      provider: b.provider,
      department: undefined,
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
          `with ${b.provider ?? 'the provider'} but no payroll deduction is recorded.`,
        financial_impact: b.monthly_cost,
        match_confidence: result.confidence,
        provider: b.provider,
        department: result.record.department,
        details: { benefit_record: b, payroll_record: result.record, matched_by: result.matchedBy },
      })
    }
  }

  return issues
}

function detectDuplicateBilling(benefits: BenefitRecord[]): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []
  const seen = new Map<string, BenefitRecord[]>()

  for (const b of benefits) {
    const key = (b.ni_number ?? b.email ?? b.payroll_id ?? b.name).toLowerCase().trim()
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
      match_confidence: 1.0,
      provider: records[0].provider,
      department: undefined,
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

  for (const b of benefits) {
    // Skip if there's a hard-identifier match — the name difference is cosmetic
    const hardMatch = payroll.find(
      (p) =>
        (b.ni_number && p.ni_number && b.ni_number.toUpperCase() === p.ni_number.toUpperCase()) ||
        (b.email && p.email && b.email.toLowerCase() === p.email.toLowerCase()) ||
        (b.payroll_id && p.payroll_id && b.payroll_id === p.payroll_id)
    )
    if (hardMatch) continue

    // Look for a fuzzy-but-not-exact name match
    const fuse = new Fuse(payroll, { keys: ['name'], includeScore: true, threshold: 0.4 })
    const results = fuse.search(b.name)

    // score > 0.05 means it's NOT an exact match but still similar
    if (results.length > 0 && results[0].score !== undefined && results[0].score > 0.05) {
      const closest = results[0].item
      const confidence = Math.round((1 - results[0].score) * 100) / 100

      issues.push({
        issue_type: 'name_mismatch',
        severity: 'warning',
        affected_name: b.name,
        affected_email: b.email,
        affected_ni_number: b.ni_number,
        description:
          `"${b.name}" in benefits closely resembles "${closest.name}" in payroll but ` +
          `doesn't match exactly. Could be a typo, nickname, or a different person. Verify manually.`,
        financial_impact: undefined,
        match_confidence: confidence,
        provider: b.provider,
        department: closest.department,
        details: {
          benefit_name: b.name,
          payroll_name: closest.name,
          fuse_score: results[0].score,
          matched_by: 'fuzzy_name',
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
        financial_impact: undefined,
        match_confidence: undefined,
        department: p.department,
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
          `${p.name} is missing a Payroll ID. Without it, matching relies on name and email only.`,
        financial_impact: undefined,
        match_confidence: undefined,
        department: p.department,
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
  ghostEmployees: number
  estimatedMonthlyLeakage: number
}

export function runReconciliation(
  payroll: PayrollRecord[],
  benefits: BenefitRecord[]
): ReconciliationSummary {
  const ghostEmployeeIssues = detectGhostEmployees(benefits, payroll)
  const duplicates = detectDuplicateBilling(benefits)
  const missingDeductions = detectMissingDeductions(benefits, payroll)
  const nameMismatches = detectNameMismatches(benefits, payroll)
  const missingData = detectMissingData(payroll)

  // Sort: critical first, then warning, then info
  const issues: ReconciliationIssue[] = [
    ...ghostEmployeeIssues,
    ...duplicates,
    ...missingDeductions,
    ...nameMismatches,
    ...missingData,
  ]

  const criticalIssues = issues.filter((i) => i.severity === 'critical').length
  const warningIssues = issues.filter((i) => i.severity === 'warning').length
  const infoIssues = issues.filter((i) => i.severity === 'info').length
  const ghostEmployees = ghostEmployeeIssues.length
  const estimatedMonthlyLeakage = issues.reduce((sum, i) => sum + (i.financial_impact ?? 0), 0)

  return {
    issues,
    totalIssues: issues.length,
    criticalIssues,
    warningIssues,
    infoIssues,
    ghostEmployees,
    estimatedMonthlyLeakage,
  }
}
