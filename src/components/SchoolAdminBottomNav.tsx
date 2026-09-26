'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SchoolAdminBottomNav() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/school-admin/dashboard') {
      return pathname === '/school-admin/dashboard' || pathname === '/school-admin'
    }
    return pathname.startsWith(path)
  }

  const navItems = [
    { path: '/school-admin/dashboard', label: '📊 Dashboard', icon: '📊' },
    { path: '/school-admin/staff', label: '👨‍🏫 Staff', icon: '👨‍🏫' },
    { path: '/school-admin/students', label: '👨‍🎓 Students', icon: '👨‍🎓' },
    { path: '/school-admin/results', label: '📈 Results', icon: '📈' },
    { path: '/school-admin/school-fees', label: '💰 Fees', icon: '💰' },
    { path: '/school-admin/academic', label: '📚 Academic', icon: '📚' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-0">
        <nav className="flex overflow-x-auto">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex-1 min-w-max md:min-w-0 px-3 md:px-6 py-3 text-center font-semibold text-xs md:text-sm border-b-4 transition-all whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.icon}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
