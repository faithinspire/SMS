'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AuthService } from '@/services/auth.service'
import { User } from '@/types'

export default function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Cache to prevent repeated auth checks
  const userCacheRef = useRef<{ user: User | null; timestamp: number } | null>(null)
  const CACHE_DURATION = 60000 // 60 seconds - cache user data

  // Get user with caching
  const getUserWithCache = useCallback(async () => {
    const now = Date.now()
    
    // Use cached user if still valid
    if (userCacheRef.current && (now - userCacheRef.current.timestamp) < CACHE_DURATION) {
      setUser(userCacheRef.current.user)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()
      
      // Update cache
      userCacheRef.current = {
        user: currentUser,
        timestamp: now,
      }
      
      setUser(currentUser)
    } catch (err) {
      console.error('[BottomNav] Error loading user:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load user only once on mount
  useEffect(() => {
    getUserWithCache()
  }, [getUserWithCache])

  // Don't show nav while loading or if no user
  if (loading || !user) return null

  // Don't show nav on auth/login pages
  if (pathname?.includes('/auth/') || pathname?.includes('/landing')) {
    return null
  }

  // Navigation items based on user role
  const getNavItems = useCallback(() => {
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
          { icon: '🏫', label: 'Dashboard', path: '/school-admin/dashboard' },
          { icon: '👥', label: 'Staff', path: '/school-admin/staff' },
          { icon: '📚', label: 'Students', path: '/school-admin/students' },
          { icon: '📊', label: 'Results', path: '/school-admin/results' },
        ]
      case 'ACCOUNTANT':
        return [
          { icon: '📊', label: 'Dashboard', path: '/accountant/dashboard' },
          { icon: '💰', label: 'Primary', path: '/accountant/primary/dashboard' },
          { icon: '📈', label: 'Secondary', path: '/accountant/secondary/dashboard' },
          { icon: '📋', label: 'History', path: '/accountant/payment-history' },
        ]
      default:
        return []
    }
  }, [user.role])

  const navItems = getNavItems()
  
  // Memoize active path check
  const isActive = useCallback((path: string) => {
    return pathname === path || pathname?.startsWith(path)
  }, [pathname])

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
