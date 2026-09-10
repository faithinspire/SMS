'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import EnhancedHeader from '@/components/EnhancedHeader'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  school_id: string
  photo_url?: string
  created_at?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('School')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()
        if (!currentUser) {
          router.push('/landing')
          return
        }

        setUser(currentUser)
        setSchoolName(currentUser.schoolId || 'School')
      } catch (error) {
        console.error('Error loading profile:', error)
        router.push('/landing')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <EnhancedHeader staffName="Loading..." schoolName="School" userRole="User" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-pink-500"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <EnhancedHeader
        staffName={user.full_name}
        schoolName={schoolName}
        staffPhoto={user.photo_url}
        userRole={user.role}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-col items-center">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.full_name}
                    className="w-24 h-24 rounded-full object-cover mb-4 ring-4 ring-blue-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mb-4 text-white text-4xl font-bold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-900 text-center">{user.full_name}</h2>
                <p className="text-gray-600 text-sm mt-1">{user.email}</p>
                <div className="mt-4 px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {user.role}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {user.full_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {user.role}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      User ID
                    </label>
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm font-mono">
                      {user.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>

                {user.created_at && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Member Since
                    </label>
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-4 flex-wrap">
                <button
                  onClick={() => router.push('/profile/settings')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={() => router.push('/profile/change-password')}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
                >
                  🔐 Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
