import Papa from 'papaparse'
import type { BenefitRecord, PayrollRecord } from '@/types'

// ─── Header normalisation ─────────────────────────────────────────────────────

const PAYROLL_FIELD_MAP: Record<string, string[]> = {
  name: ['name', 'full_name', 'employee_name', 'employee', 'staff_name', 'fullname'],
  email: ['email', 'email_address', 'work_email', 'emailaddress'],
  ni_number: [
    'ni_number', 'ni', 'national_insurance', 'nino', 'ni_no',
    'national_insurance_number', 'nationalinsurance',
  ],
  payroll_id: ['payroll_id', 'employee_id', 'staff_id', 'id', 'emp_id', 'employeeid'],
  department: ['department', 'dept', 'division', 'team', 'cost_centre'],
  gross_pay: ['gross_pay', 'gross_salary', 'gross', 'salary', 'pay', 'gross_wages'],
  benefit_deduction: [
    'benefit_deduction', 'deduction', 'benefits_deduction',
    'benefit_amount', 'benefits', 'p11d_deduction',
  ],
}

const BENEFITS_FIELD_MAP: Record<string, string[]> = {
  name: ['name', 'full_name', 'employee_name', 'employee', 'member_name', 'fullname'],
  email: ['email', 'email_address', 'work_email', 'emailaddress'],
  ni_number: [
    'ni_number', 'ni', 'national_insurance', 'nino', 'ni_no',
    'national_insurance_number',
  ],
  payroll_id: ['payroll_id', 'employee_id', 'staff_id', 'id', 'emp_id', 'employeeid'],
  provider: ['provider', 'benefit_provider', 'insurance_provider', 'supplier'],
  benefit_type: ['benefit_type', 'type', 'description', 'benefit', 'plan', 'product'],
  monthly_cost: [
    'monthly_cost', 'cost', 'amount', 'monthly_premium', 'premium',
    'charge', 'invoice_amount', 'monthly_charge', 'fee',
  ],
}

function normaliseKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function mapRow(
  raw: Record<string, string>,
  fieldMap: Record<string, string[]>
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const rawKey of Object.keys(raw)) {
    const normKey = normaliseKey(rawKey)
    for (const standardField of Object.keys(fieldMap)) {
      if (fieldMap[standardField].includes(normKey)) {
        result[standardField] = (raw[rawKey] ?? '').trim()
        break
      }
    }
  }

  return result
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function toNumber(val: string | undefined): number | undefined {
  if (!val) return undefined
  const n = parseFloat(val.replace(/[£,$,€,\s]/g, ''))
  return isNaN(n) ? undefined : n
}

function toOptionalString(val: string | undefined): string | undefined {
  return val && val.trim() !== '' ? val.trim() : undefined
}

// ─── Public parsers ───────────────────────────────────────────────────────────

export interface ParseResult<T> {
  records: T[]
  errors: string[]
  rawHeaders: string[]
}

export function parsePayrollCSV(csvText: string): ParseResult<PayrollRecord> {
  const errors: string[] = []

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const rawHeaders = result.meta.fields ?? []

  if (result.errors.length > 0) {
    result.errors.forEach((e) => errors.push(e.message))
  }

  const records: PayrollRecord[] = []

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i]
    const mapped = mapRow(row, PAYROLL_FIELD_MAP)

    if (!mapped.name || mapped.name === '') {
      errors.push(`Row ${i + 2}: missing employee name — skipped`)
      continue
    }

    records.push({
      name: mapped.name,
      email: toOptionalString(mapped.email),
      ni_number: toOptionalString(mapped.ni_number),
      payroll_id: toOptionalString(mapped.payroll_id),
      department: toOptionalString(mapped.department),
      gross_pay: toNumber(mapped.gross_pay),
      benefit_deduction: toNumber(mapped.benefit_deduction),
    })
  }

  return { records, errors, rawHeaders }
}

export function parseBenefitsCSV(csvText: string): ParseResult<BenefitRecord> {
  const errors: string[] = []

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const rawHeaders = result.meta.fields ?? []

  if (result.errors.length > 0) {
    result.errors.forEach((e) => errors.push(e.message))
  }

  const records: BenefitRecord[] = []

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i]
    const mapped = mapRow(row, BENEFITS_FIELD_MAP)

    if (!mapped.name || mapped.name === '') {
      errors.push(`Row ${i + 2}: missing employee name — skipped`)
      continue
    }

    const monthlyCost = toNumber(mapped.monthly_cost)
    if (monthlyCost === undefined) {
      errors.push(`Row ${i + 2}: could not parse monthly cost for "${mapped.name}" — defaulting to 0`)
    }

    records.push({
      name: mapped.name,
      email: toOptionalString(mapped.email),
      ni_number: toOptionalString(mapped.ni_number),
      payroll_id: toOptionalString(mapped.payroll_id),
      provider: toOptionalString(mapped.provider),
      benefit_type: toOptionalString(mapped.benefit_type),
      monthly_cost: monthlyCost ?? 0,
    })
  }

  return { records, errors, rawHeaders }
}
