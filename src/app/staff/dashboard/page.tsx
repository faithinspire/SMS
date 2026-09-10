'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { AuthService } from '@/services/auth.service'
import BroadcastInbox from '@/components/BroadcastInbox'
import Link from 'next/link'

interface StaffDashboardStats {
  role: string
  department: string
  joinDate: string
}

export default function StaffDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [stats, setStats] = useState<StaffDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadBroadcasts, setUnreadBroadcasts] = useState(0)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      // Verify user is staff
      if (!currentUser || !['STAFF', 'ACCOUNTANT'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load school data
      if (currentUser.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        setSchool(schoolData)

        // Set stats
        setStats({
          role: currentUser.role === 'ACCOUNTANT' ? 'Accountant' : 'Staff',
          department: 'General',
          joinDate: new Date(currentUser.created_at || Date.now()).toLocaleDateString(),
        })
      }
    } catch (error) {
      console.error('Load dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold">👤 Staff Dashboard</h1>
              <p className="text-amber-100 mt-1">{school?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-white">
                <BroadcastInbox
                  userId={user.id}
                  userRole={user.role}
                  schoolId={user.school_id}
                  unreadCount={unreadBroadcasts}
                  onUnreadCountChange={setUnreadBroadcasts}
                />
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* User Info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{user.full_name}</h2>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-gray-600">{user.phone_number || 'No phone on file'}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Role</p>
                <p className="text-lg font-bold text-amber-900">{stats?.role}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Join Date</p>
                <p className="text-lg font-bold text-orange-900">{stats?.joinDate}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Link
                href="/staff/account"
                className="block px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-center transition"
              >
                My Account
              </Link>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Information Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* About This Dashboard */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📋 About Your Dashboard</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✅ View school announcements and broadcasts</li>
              <li>✅ Check important notifications</li>
              <li>✅ Access your account settings</li>
              <li>✅ View school information and updates</li>
            </ul>
          </div>

          {/* School Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🏫 School Information</h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>School:</strong> {school?.name}</p>
              <p><strong>Type:</strong> {school?.type || 'Not specified'}</p>
              <p><strong>Status:</strong> {school?.status === 'active' ? '✅ Active' : '❌ Inactive'}</p>
            </div>
          </div>
        </div>

        {/* Broadcasts Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📢 Recent Announcements</h3>
          <p className="text-gray-600">
            Check your inbox above for recent broadcasts and announcements from school administration.
          </p>
        </div>
      </div>
    </div>
  )
}
