'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { AuthService } from '@/services/auth.service'
import { User } from '@/types'

export default function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()
        setUser(currentUser)
      } catch (err) {
        console.error('Error loading user:', err)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  if (loading || !user) return null

  // Don't show nav on auth/login pages
  if (pathname?.includes('/auth/') || pathname?.includes('/landing')) {
    return null
  }

  // Navigation items based on user role
  const getNavItems = () => {
    switch (user.role) {
      case 'STUDENT':
        return [
          { icon: '📊', label: 'Dashboard', path: '/student/dashboard' },
          { icon: '📝', label: 'Assignments', path: '/student/assignments' },
          { icon: '📈', label: 'Results', path: '/student/results' },
          { icon: '⚙️', label: 'Settings', path: '/student/settings' },
        ]
      case 'TEACHER':
        return [
          { icon: '📊', label: 'Dashboard', path: '/teacher/dashboard' },
          { icon: '📝', label: 'Assignments', path: '/teacher/assignments' },
          { icon: '📚', label: 'Notes', path: '/teacher/lesson-notes' },
          { icon: '📋', label: 'Scores', path: '/teacher/score-sheet' },
        ]
      case 'PRINCIPAL':
      case 'HEAD_TEACHER':
        return [
          { icon: '📊', label: 'Dashboard', path: '/principal/dashboard' },
          { icon: '📚', label: 'Notes', path: '/principal/lesson-notes' },
          { icon: '📈', label: 'Results', path: '/principal/results' },
          { icon: '⚙️', label: 'Settings', path: '/principal/settings' },
        ]
      case 'SCHOOL_ADMIN':
      case 'ADMIN':
        return [
          { icon: '🏫', label: 'Admin', path: '/school-admin/dashboard' },
          { icon: '📋', label: 'Records', path: '/school-admin/records' },
          { icon: '👥', label: 'Staff', path: '/school-admin/staff' },
          { icon: '📚', label: 'Students', path: '/school-admin/students' },
        ]
      case 'ACCOUNTANT':
        return [
          { icon: '💰', label: 'Dashboard', path: '/accountant/dashboard' },
          { icon: '💳', label: 'Transactions', path: '/accountant/transactions' },
          { icon: '📊', label: 'Reports', path: '/accountant/reports' },
          { icon: '⚙️', label: 'Settings', path: '/accountant/settings' },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-xl z-50">
      <div className="flex justify-around items-stretch w-full">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-1 transition-all duration-200 border-t-4 ${
              isActive(item.path)
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-600 border-transparent hover:text-blue-500 hover:bg-gray-50'
            }`}
            title={item.label}
          >
            <span className="text-2xl leading-none mb-1">{item.icon}</span>
            <span className="text-xs font-semibold text-center leading-tight whitespace-nowrap">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
