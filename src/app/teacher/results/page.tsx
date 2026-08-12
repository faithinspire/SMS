'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { User } from '@/types'

export default function TeacherResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()
        
        if (!currentUser || currentUser.role !== 'TEACHER') {
          router.push('/landing')
          return
        }

        setUser(currentUser)
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/landing')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Unauthorized</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Results Management</h1>
        <p className="text-gray-600 mt-2">Manage and view student results</p>
        
        <div className="mt-8 bg-white rounded-lg shadow p-8">
          <p className="text-gray-600">Results management feature coming soon...</p>
        </div>
      </div>
    </div>
  )
}
