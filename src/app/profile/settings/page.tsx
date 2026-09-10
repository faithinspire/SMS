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
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">⚙️ Settings</h1>

          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-8">
            {/* Notification Settings */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Settings</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-gray-700">Email notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-gray-700">Broadcast messages</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-gray-700">Assignment updates</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-gray-700">Result notifications</span>
                </label>
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Privacy Settings</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-gray-700">Profile visibility (shown to other users)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className="text-gray-700">Allow direct messages</span>
                </label>
              </div>
            </div>

            {/* Theme Settings */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Display Settings</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Theme</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Light</option>
                    <option>Dark</option>
                    <option>Auto</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setMessage('Settings saved successfully!')
                  setTimeout(() => setMessage(''), 3000)
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                💾 Save Settings
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
