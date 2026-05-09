'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload', label: 'New Run' },
]

export default function Navbar({ userEmail }: { userEmail?: string }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10" style={{ backgroundColor: '#162660' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: '#D0E6FD', color: '#162660' }}
            >
              SL
            </div>
            <span className="font-bold text-white text-base tracking-tight">SLex</span>
          </Link>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={
                    isActive
                      ? { backgroundColor: 'rgba(208, 230, 253, 0.15)', color: '#D0E6FD' }
                      : { color: 'rgba(255,255,255,0.65)' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#fff'
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                      e.currentTarget.style.backgroundColor = ''
                    }
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden sm:block text-xs max-w-[160px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {userEmail}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm px-3 py-1.5 rounded-md transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                e.currentTarget.style.backgroundColor = ''
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
