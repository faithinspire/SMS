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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl z-50">
      <div className="w-full px-0">
        <div className="flex overflow-x-auto">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex-1 min-w-max md:min-w-0 px-2 md:px-6 py-4 text-center font-bold text-xs md:text-sm border-b-4 transition-all duration-200 whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                }`}
              >
                <span className="block md:hidden text-lg">{item.icon}</span>
                <span className="hidden md:block">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
