'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

interface Payment {
  id: string
  amount: number
  payment_method: string
  status: string
  created_at: string
  payer_name?: string
}

export default function AccountantDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    totalExpenses: 0,
    totalStaff: 0,
  })
  const [payments, setPayments] = useState<Payment[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'salaries' | 'reports'>('overview')
  const [filterType, setFilterType] = useState<'all' | 'student' | 'staff'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || (currentUser as any).role !== 'ACCOUNTANT') {
        router.push('/landing')
        return
      }

      setUser(currentUser as any)

      if ((currentUser as any).schoolId) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', (currentUser as any).schoolId)
          .single()

        setSchool(schoolData)

        // Load payments
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('school_id', (currentUser as any).schoolId)
          .order('created_at', { ascending: false })
          .limit(10)

        setPayments(paymentsData || [])

        // Calculate stats
        const totalRevenue = paymentsData?.reduce((sum: number, p) => {
          return p.status === 'COMPLETED' ? sum + p.amount : sum
        }, 0) || 0

        const pendingPayments = paymentsData?.reduce((sum: number, p) => {
          return p.status === 'PENDING' ? sum + p.amount : sum
        }, 0) || 0

        setStats({
          totalRevenue,
          pendingPayments,
          totalExpenses: 0,
          totalStaff: 0,
        })
      }
    } catch (error) {
      console.error('Load data error:', error)
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
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-orange-500 mx-auto mb-4"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold">💰 Accountant Dashboard</h1>
              <p className="text-yellow-100 mt-1">{school?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Financial Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">₦{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <span className="text-3xl">💵</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending Payments</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">₦{stats.pendingPayments.toLocaleString()}</p>
              </div>
              <span className="text-3xl">⏳</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">₦{stats.totalExpenses.toLocaleString()}</p>
              </div>
              <span className="text-3xl">📊</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Staff</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStaff}</p>
              </div>
              <span className="text-3xl">👥</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => {
              setFilterType('student')
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
          >
            💳 Record Student Payment
          </button>
          <button
            onClick={() => {
              setFilterType('staff')
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
          >
            👤 Record Staff Salary
          </button>
          <Link href="/accountant/payment-history">
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
              📋 Payment History
            </button>
          </Link>
          <button className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg">
            📈 Generate Report
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="flex gap-4 p-4 border-b flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💳 Student Payments
            </button>
            <button
              onClick={() => setActiveTab('salaries')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'salaries'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👤 Staff Salaries
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'reports'
                  ? 'bg-yellow-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📈 Reports
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-lg">
                  <h3 className="font-bold text-green-900 mb-4">Recent Payments</h3>
                  <div className="space-y-3">
                    {payments.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="bg-white p-3 rounded flex justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{payment.payer_name || 'Student'}</p>
                          <p className="text-xs text-gray-600">{new Date(payment.created_at).toLocaleDateString()}</p>
                        </div>
                        <p className="font-bold text-green-700">₦{payment.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 p-6 rounded-lg">
                  <h3 className="font-bold text-yellow-900 mb-4">Payment Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <p className="text-gray-700">Completed</p>
                      <p className="font-bold text-gray-900">{payments.filter(p => p.status === 'COMPLETED').length}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-gray-700">Pending</p>
                      <p className="font-bold text-orange-600">{payments.filter(p => p.status === 'PENDING').length}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-gray-700">Failed</p>
                      <p className="font-bold text-red-600">{payments.filter(p => p.status === 'FAILED').length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Student Payment Records</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Student Name</th>
                      <th className="px-4 py-2 text-left font-semibold">Amount</th>
                      <th className="px-4 py-2 text-left font-semibold">Method</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{payment.payer_name || '-'}</td>
                        <td className="px-4 py-2 font-bold">₦{payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-2">{payment.payment_method}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">{new Date(payment.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Salaries Tab */}
          {activeTab === 'salaries' && (
            <div className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Staff Salary Records</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Staff Name</th>
                      <th className="px-4 py-2 text-left font-semibold">Amount</th>
                      <th className="px-4 py-2 text-left font-semibold">Month</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{payment.payer_name || '-'}</td>
                        <td className="px-4 py-2 font-bold">₦{payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-2">{new Date(payment.created_at).toLocaleString('default', { month: 'long', year: 'numeric' })}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">{new Date(payment.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Financial Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-4">Monthly Summary</h4>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition">
                    Generate Monthly Report
                  </button>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-6 rounded-lg">
                  <h4 className="font-bold text-purple-900 mb-4">Annual Summary</h4>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded transition">
                    Generate Annual Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">Welcome, {user?.full_name || user?.name || 'Accountant'}!</h3>
          <p className="text-yellow-100">
            Manage all financial transactions, record student payments and staff salaries, track expenses, and generate financial reports. All records are securely stored and easily accessible.
          </p>
        </div>
      </div>
    </div>
  )
}
