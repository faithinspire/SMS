'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { User } from '@/types'
import Link from 'next/link'

interface DashboardStats {
  totalSchools: number
  totalUsers: number
  totalStudents: number
  activeSubscriptions: number
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalSchools: 0,
    totalUsers: 0,
    totalStudents: 0,
    activeSubscriptions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()
        
        if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
          router.push('/landing')
          return
        }

        setUser(currentUser)
        await fetchDashboardStats()
      } catch (err) {
        console.error('Error checking auth:', err)
        setError('Failed to load dashboard')
        router.push('/landing')
      } finally {
        setLoading(false)
      }
    }

    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/superadmin/dashboard-stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Unauthorized Access</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Super Admin Dashboard</h1>
              <p className="text-purple-100 mt-2">System-wide Management & Analytics</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Schools</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSchools}</p>
              </div>
              <div className="text-4xl">🏫</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
              </div>
              <div className="text-4xl">👨‍🎓</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeSubscriptions}</p>
              </div>
              <div className="text-4xl">✓</div>
            </div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Schools Management */}
          <Link href="/superadmin/schools">
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer h-full">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
                <h2 className="text-xl font-bold text-gray-900">📋 Schools Management</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">View and manage all registered schools, their details, and subscription status</p>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition">
                  View Schools
                </button>
              </div>
            </div>
          </Link>

          {/* Register New School */}
          <Link href="/superadmin/register-school">
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer h-full">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
                <h2 className="text-xl font-bold text-gray-900">➕ Register School</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">Register a new school with admin credentials and subscription plan</p>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition">
                  Register School
                </button>
              </div>
            </div>
          </Link>

          {/* Users Management */}
          <Link href="/superadmin/users">
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer h-full">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <h2 className="text-xl font-bold text-gray-900">👥 Users Management</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">View and manage all users across all schools with role-based access</p>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
                  View Users
                </button>
              </div>
            </div>
          </Link>

          {/* Reports & Analytics */}
          <div className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer h-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
              <h2 className="text-xl font-bold text-gray-900">📊 Reports & Analytics</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">View system reports, usage analytics, and performance metrics</p>
              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition">
                View Reports
              </button>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Welcome, {user.full_name}!</h3>
              <p className="text-purple-100">You have full administrative access to manage the School Management System. Monitor all schools, users, and system-wide operations from this dashboard.</p>
            </div>
            <div className="text-6xl hidden sm:block">🎓</div>
          </div>
        </div>
      </div>
    </div>
  )
}
