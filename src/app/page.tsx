'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthService } from '@/services/auth.service'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        const user = await AuthService.getCurrentUser()
        
        if (!user) {
          // No user logged in, show landing page
          router.push('/landing')
          return
        }

        // User is logged in, redirect to appropriate dashboard
        console.log('✅ User found, redirecting to dashboard. Role:', user.role)
        
        switch (user.role) {
          case 'SUPER_ADMIN':
            router.push('/superadmin/dashboard')
            break
          case 'SCHOOL_ADMIN':
          case 'ADMIN':
            router.push('/school-admin/dashboard')
            break
          case 'PRINCIPAL':
            router.push('/principal/dashboard')
            break
          case 'HEAD_TEACHER':
            router.push('/headmaster/dashboard')
            break
          case 'TEACHER':
            router.push('/teacher/dashboard')
            break
          case 'STUDENT':
            router.push('/student/dashboard')
            break
          case 'ACCOUNTANT':
            router.push('/accountant/dashboard')
            break
          case 'STAFF':
            router.push('/staff/account')
            break
          default:
            router.push('/landing')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/landing')
      }
    }

    checkAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-pink-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    </div>
  )
}
