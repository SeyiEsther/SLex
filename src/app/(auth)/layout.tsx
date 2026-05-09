export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #D0E6FD 0%, #ffffff 50%, #F1E4D1 100%)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base"
              style={{ backgroundColor: '#162660', color: '#D0E6FD' }}
            >
              SL
            </div>
            <span className="text-2xl font-bold" style={{ color: '#162660' }}>SLex</span>
          </div>
          <p className="text-sm text-gray-500">Payroll &amp; Benefits Reconciliation</p>
        </div>
        {children}
      </div>
    </div>
  )
}
