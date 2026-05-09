import type { BenefitRecord, PayrollRecord } from '@/types'

export interface ValidationResult {
  missingRequiredColumns: string[]
  missingOptionalColumns: string[]
  rowsWithMissingNI: number
  rowsWithMissingEmail: number
  duplicateCount: number
  warnings: string[]
}

const PAYROLL_REQUIRED = ['name']
const PAYROLL_OPTIONAL = ['email', 'ni_number', 'payroll_id', 'department', 'gross_pay', 'benefit_deduction']
const BENEFITS_REQUIRED = ['name', 'monthly_cost']
const BENEFITS_OPTIONAL = ['email', 'ni_number', 'payroll_id', 'provider', 'benefit_type', 'provider_member_id']

function countDuplicates<T extends { name: string; ni_number?: string; email?: string }>(
  records: T[]
): number {
  const seen = new Set<string>()
  let dupes = 0
  for (const r of records) {
    const key = (r.ni_number ?? r.email ?? r.name).toLowerCase().trim()
    if (seen.has(key)) dupes++
    else seen.add(key)
  }
  return dupes
}

export function validatePayroll(
  records: PayrollRecord[],
  rawHeaders: string[]
): ValidationResult {
  const normHeaders = rawHeaders.map((h) => h.toLowerCase().trim())

  const missingRequired = PAYROLL_REQUIRED.filter(
    (f) => !normHeaders.some((h) => h.includes(f.replace('_', '')))
  )
  const missingOptional = PAYROLL_OPTIONAL.filter(
    (f) => !normHeaders.some((h) => h.includes(f.replace('_', '')))
  )

  const rowsWithMissingNI = records.filter((r) => !r.ni_number).length
  const rowsWithMissingEmail = records.filter((r) => !r.email).length
  const duplicateCount = countDuplicates(records)

  const warnings: string[] = []
  if (rowsWithMissingNI > 0)
    warnings.push(`${rowsWithMissingNI} employee${rowsWithMissingNI > 1 ? 's' : ''} missing NI number — matching accuracy will be reduced`)
  if (duplicateCount > 0)
    warnings.push(`${duplicateCount} potential duplicate employee record${duplicateCount > 1 ? 's' : ''} detected`)
  if (rowsWithMissingEmail > Math.ceil(records.length * 0.5))
    warnings.push('More than 50% of employees are missing email addresses')

  return { missingRequiredColumns: missingRequired, missingOptionalColumns: missingOptional, rowsWithMissingNI, rowsWithMissingEmail, duplicateCount, warnings }
}

export function validateBenefits(
  records: BenefitRecord[],
  rawHeaders: string[]
): ValidationResult {
  const normHeaders = rawHeaders.map((h) => h.toLowerCase().trim())

  const missingRequired = BENEFITS_REQUIRED.filter(
    (f) => !normHeaders.some((h) => h.includes(f.replace('_', '')))
  )
  const missingOptional = BENEFITS_OPTIONAL.filter(
    (f) => !normHeaders.some((h) => h.includes(f.replace('_', '')))
  )

  const rowsWithMissingNI = records.filter((r) => !r.ni_number).length
  const rowsWithMissingEmail = records.filter((r) => !r.email).length
  const duplicateCount = countDuplicates(records)

  const warnings: string[] = []
  if (rowsWithMissingNI > 0)
    warnings.push(`${rowsWithMissingNI} benefit record${rowsWithMissingNI > 1 ? 's' : ''} missing NI number`)
  if (duplicateCount > 0)
    warnings.push(`${duplicateCount} potential duplicate benefit record${duplicateCount > 1 ? 's' : ''} — may indicate duplicate billing`)

  return { missingRequiredColumns: missingRequired, missingOptionalColumns: missingOptional, rowsWithMissingNI, rowsWithMissingEmail, duplicateCount, warnings }
}
