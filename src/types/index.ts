// ─── CSV Record Types ────────────────────────────────────────────────────────

export interface PayrollRecord {
  name: string
  email?: string
  ni_number?: string
  payroll_id?: string
  department?: string
  gross_pay?: number
  benefit_deduction?: number
}

export interface BenefitRecord {
  name: string
  email?: string
  ni_number?: string
  payroll_id?: string
  provider?: string
  benefit_type?: string
  monthly_cost: number
}

// ─── Reconciliation Types ─────────────────────────────────────────────────────

export type IssueType =
  | 'ghost_employee'
  | 'missing_deduction'
  | 'duplicate_billing'
  | 'name_mismatch'
  | 'missing_data'

export type IssueSeverity = 'critical' | 'warning' | 'info'

export type IssueStatus = 'open' | 'resolved' | 'dismissed'

export interface ReconciliationIssue {
  id?: string
  run_id?: string
  issue_type: IssueType
  severity: IssueSeverity
  affected_name: string
  affected_email?: string
  affected_ni_number?: string
  description: string
  financial_impact?: number
  details: Record<string, unknown>
  status?: IssueStatus
  created_at?: string
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface ReconciliationRun {
  id: string
  user_id: string
  name: string
  status: 'pending' | 'processing' | 'complete' | 'failed'
  total_issues: number
  critical_issues: number
  warning_issues: number
  estimated_monthly_leakage: number
  created_at: string
  completed_at?: string
  payroll_row_count?: number
  benefits_row_count?: number
}

export interface UploadedFile {
  id: string
  user_id: string
  run_id?: string
  file_type: 'payroll' | 'benefits'
  filename: string
  row_count: number
  created_at: string
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ReconcileRequest {
  name: string
  payroll: PayrollRecord[]
  benefits: BenefitRecord[]
}

export interface ReconcileResponse {
  runId: string
  totalIssues: number
  criticalIssues: number
  estimatedMonthlyLeakage: number
}

// ─── UI Helper Types ──────────────────────────────────────────────────────────

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  ghost_employee: 'Ghost Employee',
  missing_deduction: 'Missing Deduction',
  duplicate_billing: 'Duplicate Billing',
  name_mismatch: 'Name Mismatch',
  missing_data: 'Missing Data',
}

export const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}
