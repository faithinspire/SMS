'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import EnhancedHeader from '@/components/EnhancedHeader'
import { supabase } from '@/lib/supabase-client'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  school_id: string
  photo_url?: string
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [schoolName, setSchoolName] = useState('School')
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setUpdating(true)

    try {
      // Validate form
      if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
        setError('All fields are required')
        setUpdating(false)
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match')
        setUpdating(false)
        return
      }

      if (formData.newPassword.length < 6) {
        setError('New password must be at least 6 characters')
        setUpdating(false)
        return
      }

      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (updateError) {
        setError(updateError.message || 'Failed to update password')
        setUpdating(false)
        return
      }

      setMessage('Password changed successfully!')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      setTimeout(() => {
        setMessage('')
        router.push('/profile')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setUpdating(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔐 Change Password</h1>
          <p className="text-gray-600 mb-8">Update your account password to keep it secure</p>

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-semibold">
              ✅ {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your current password"
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Note: For security, you may need to verify your identity
              </p>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a new password (min. 6 characters)"
                required
              />
              <div className="text-xs text-gray-600 mt-2 space-y-1">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside">
                  <li>At least 6 characters long</li>
                  <li>Mix of uppercase and lowercase (recommended)</li>
                  <li>Include numbers or special characters (recommended)</li>
                </ul>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Re-enter your new password"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={updating}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                {updating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Update Password</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                ← Back
              </button>
            </div>
          </form>

          {/* Security Tips */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2">🔒 Security Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use a unique password not used elsewhere</li>
              <li>Update your password regularly</li>
              <li>Never share your password with anyone</li>
              <li>Log out from other devices if you suspect suspicious activity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
