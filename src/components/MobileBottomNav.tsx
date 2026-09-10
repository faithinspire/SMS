'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    console.log('[MobileNav] ✅ Mounted')

    // Check authentication state
    const checkAuth = async () => {
      try {
        const user = await AuthService.getCurrentUser()
        if (user && user.role) {
          setIsAuthenticated(true)
          setUserRole(user.role)
          console.log('[MobileNav] Auth check - Role:', user.role)
        } else {
          setIsAuthenticated(false)
          setUserRole(null)
          console.log('[MobileNav] Auth check - No user')
        }
      } catch (error) {
        console.error('[MobileNav] Auth check failed:', error)
        setIsAuthenticated(false)
        setUserRole(null)
      }
    }

    checkAuth()
  }, [])

  const handleNavigation = useCallback((path: string) => {
    console.log('[MobileNav] Navigating to:', path)
    router.push(path)
  }, [router])

  if (!isMounted || !userRole || !isAuthenticated) return null

  const isActive = (path: string) => pathname?.startsWith(path.split('#')[0])

  const getNavItems = () => {
    const baseItems = {
      TEACHER: [
        { label: 'Home', path: '/teacher/dashboard', icon: '🏠' },
        { label: 'Attendance', path: '/teacher/attendance', icon: '✓' },
        { label: 'Scores', path: '/teacher/score-sheet', icon: '📈' },
        { label: 'CBT', path: '/teacher/cbt-management', icon: '🧪' },
      ],
      STUDENT: [
        { label: 'Home', path: '/student/dashboard', icon: '🏠' },
        { label: 'CBT', path: '/student/cbt', icon: '🧪' },
        { label: 'Results', path: '/student/results', icon: '📊' },
        { label: 'Profile', path: '/student/profile', icon: '👤' },
      ],
      ADMIN: [
        { label: 'Home', path: '/school-admin/dashboard', icon: '🏠' },
        { label: 'Users', path: '/school-admin/users', icon: '👥' },
        { label: 'Reports', path: '/school-admin/reports', icon: '📋' },
        { label: 'Settings', path: '/school-admin/settings', icon: '⚙️' },
      ],
      ACCOUNTANT: [
        { label: 'Home', path: '/accountant/dashboard', icon: '🏠' },
        { label: 'Invoices', path: '/accountant/invoices', icon: '📄' },
        { label: 'Reports', path: '/accountant/reports', icon: '📊' },
        { label: 'Settings', path: '/accountant/settings', icon: '⚙️' },
      ],
    }
    return baseItems[userRole as keyof typeof baseItems] || []
  }

  const navItems = getNavItems()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16 max-w-full">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors active:opacity-70 hover:bg-gray-100 ${
              isActive(item.path)
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600'
            }`}
            aria-label={item.label}
            type="button"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-semibold mt-0.5">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
