'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect /student/settings to /student/profile
 * This page exists for backward compatibility and user expectations
 */
export default function StudentSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to profile page
    router.replace('/student/profile')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-indigo-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to profile...</p>
      </div>
    </div>
  )
}
