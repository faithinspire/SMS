'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'

export default function DashboardRouter() {
  const router = useRouter()

  useEffect(() => {
    const redirectToDashboard = async () => {
      try {
        const user = await AuthService.getCurrentUser()

        if (!user) {
          router.push('/landing')
          return
        }

        console.log('🔐 User role:', user.role)
        console.log('🏫 User school:', user.schoolId)

        // Route based on role
        switch (user.role) {
          case 'SUPER_ADMIN':
            console.log('→ Redirecting to Super Admin dashboard')
            router.push('/superadmin/dashboard')
            break

          case 'SCHOOL_ADMIN':
          case 'ADMIN':
            console.log('→ Redirecting to School Admin dashboard')
            router.push('/school-admin/dashboard')
            break

          case 'PRINCIPAL':
            console.log('→ Redirecting to Principal dashboard')
            router.push('/principal/dashboard')
            break

          case 'HEAD_TEACHER':
            console.log('→ Redirecting to Headmaster dashboard')
            router.push('/headmaster/dashboard')
            break

          case 'TEACHER':
            console.log('→ Redirecting to Teacher dashboard')
            router.push('/teacher/dashboard')
            break

          case 'STUDENT':
            console.log('→ Redirecting to Student dashboard')
            router.push('/student/dashboard')
            break

          case 'ACCOUNTANT':
            console.log('→ Redirecting to Accountant dashboard')
            router.push('/accountant/dashboard')
            break

          case 'STAFF':
            console.log('→ Redirecting to Staff account page')
            router.push('/staff/account')
            break

          default:
            console.log('→ Unknown role, redirecting to landing')
            router.push('/landing')
        }
      } catch (error) {
        console.error('Dashboard router error:', error)
        router.push('/landing')
      }
    }

    redirectToDashboard()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-pink-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
