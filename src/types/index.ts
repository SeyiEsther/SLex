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
  provider_member_id?: string
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
  // 0–1 (1 = certain, 0 = no match found); null for structural issues like missing_data
  match_confidence?: number
  provider?: string
  department?: string
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
  ghost_employees: number
  estimated_monthly_leakage: number
  payroll_row_count?: number
  benefits_row_count?: number
  payroll_filename?: string
  benefits_filename?: string
  payroll_storage_path?: string
  benefits_storage_path?: string
  created_at: string
  completed_at?: string
}

export interface UploadedFile {
  id: string
  user_id: string
  run_id?: string
  file_type: 'payroll' | 'benefits'
  filename: string
  storage_path?: string
  row_count: number
  created_at: string
}

export interface PayrollDbRecord {
  id?: string
  run_id: string
  user_id: string
  name: string
  email?: string
  ni_number?: string
  payroll_id?: string
  department?: string
  gross_pay?: number
  benefit_deduction?: number
}

export interface ProviderDbRecord {
  id?: string
  run_id: string
  user_id: string
  name: string
  email?: string
  ni_number?: string
  payroll_id?: string
  provider_member_id?: string
  provider?: string
  benefit_type?: string
  monthly_cost: number
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ReconcileRequest {
  name: string
  payroll: PayrollRecord[]
  benefits: BenefitRecord[]
  payrollFilename?: string
  benefitsFilename?: string
  payrollStoragePath?: string
  benefitsStoragePath?: string
}

export interface ReconcileResponse {
  runId: string
  totalIssues: number
  criticalIssues: number
  ghostEmployees: number
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
