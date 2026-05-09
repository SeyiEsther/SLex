import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SyncLedger — Payroll & Benefits Reconciliation',
  description:
    'Detect ghost employees, benefit mismatches, and payroll data drift automatically. Stop overpaying before your next compliance deadline.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
