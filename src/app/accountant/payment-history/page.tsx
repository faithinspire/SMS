'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, School } from '@/types'

interface Payment {
  id: string
  student_name: string
  admission_no: string
  class_name: string
  amount: number
  method: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ONLINE'
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  reference: string
  payment_date: string
  receipt_number: string
  recorded_by: string
  notes: string
}

export default function AccountantPaymentHistoryPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'' | 'PENDING' | 'COMPLETED' | 'FAILED'>('')
  const [filterMethod, setFilterMethod] = useState<'' | 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ONLINE'>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })
  const [viewMode, setViewMode] = useState<'table' | 'stats'>('table')

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser) {
          router.push('/auth/accountant/login')
          return
        }

        if (currentUser.role !== 'ACCOUNTANT') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        // Get school data
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        if (schoolError) throw schoolError
        setSchool(schoolData)

        // Load payments
        await loadPayments(currentUser.school_id)
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const loadPayments = async (schoolId: string) => {
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select(
          `
          *,
          students(
            admission_no,
            users(full_name),
            class_arm_combos(name)
          ),
          users(full_name)
        `
        )
        .eq('school_id', schoolId)
        .gte('payment_date', dateRange.from)
        .lte('payment_date', dateRange.to)
        .order('payment_date', { ascending: false })

      if (paymentError) throw paymentError

      const paymentsList: Payment[] = (paymentData || []).map((payment: any) => ({
        id: payment.id,
        student_name: payment.students?.users?.full_name || 'Unknown',
        admission_no: payment.students?.admission_no || 'N/A',
        class_name: payment.students?.class_arm_combos?.name || 'N/A',
        amount: payment.amount,
        method: payment.payment_method,
        status: payment.status,
        reference: payment.reference_number || 'N/A',
        payment_date: payment.payment_date,
        receipt_number: payment.receipt_number || 'N/A',
        recorded_by: payment.users?.full_name || 'System',
        notes: payment.notes || '',
      }))

      setPayments(paymentsList)
    } catch (err) {
      console.error('Error loading payments:', err)
    }
  }

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = !filterStatus || payment.status === filterStatus
    const matchesMethod = !filterMethod || payment.method === filterMethod
    const matchesSearch =
      payment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.admission_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesMethod && matchesSearch
  })

  // Calculate statistics
  const stats = {
    totalPayments: filteredPayments.length,
    totalAmount: filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    completedAmount: filteredPayments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: filteredPayments
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0),
    failedAmount: filteredPayments
      .filter((p) => p.status === 'FAILED')
      .reduce((sum, p) => sum + p.amount, 0),
    byMethod: {
      CASH: filteredPayments.filter((p) => p.method === 'CASH').length,
      BANK_TRANSFER: filteredPayments.filter((p) => p.method === 'BANK_TRANSFER').length,
      CARD: filteredPayments.filter((p) => p.method === 'CARD').length,
      ONLINE: filteredPayments.filter((p) => p.method === 'ONLINE').length,
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Error loading data</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
              <p className="text-gray-600 mt-1">View all student payments and transactions</p>
              <p className="text-sm text-gray-500 mt-2">{school.name}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                📋 Table View
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  viewMode === 'stats'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                📊 Statistics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as '' | 'PENDING' | 'COMPLETED' | 'FAILED'
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Method
              </label>
              <select
                value={filterMethod}
                onChange={(e) =>
                  setFilterMethod(
                    e.target.value as '' | 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ONLINE'
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, admission #, or receipt #..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Statistics View */}
        {viewMode === 'stats' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <div className="text-sm text-blue-600 font-semibold mb-1">Total Transactions</div>
                <div className="text-4xl font-bold text-blue-900">{stats.totalPayments}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                <div className="text-sm text-green-600 font-semibold mb-1">Total Amount</div>
                <div className="text-4xl font-bold text-green-900">
                  ₦{stats.totalAmount.toLocaleString()}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                <div className="text-sm text-purple-600 font-semibold mb-1">Average Payment</div>
                <div className="text-4xl font-bold text-purple-900">
                  ₦{stats.totalPayments > 0 ? (stats.totalAmount / stats.totalPayments).toLocaleString(undefined, {maximumFractionDigits: 0}) : 0}
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-green-600 font-semibold">Completed</div>
                    <div className="text-3xl font-bold text-green-900 mt-2">
                      ₦{stats.completedAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-yellow-600 font-semibold">Pending</div>
                    <div className="text-3xl font-bold text-yellow-900 mt-2">
                      ₦{stats.pendingAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-4xl">⏳</div>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-red-600 font-semibold">Failed</div>
                    <div className="text-3xl font-bold text-red-900 mt-2">
                      ₦{stats.failedAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-4xl">❌</div>
                </div>
              </div>
            </div>

            {/* Method Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payments by Method</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl">💵</div>
                  <div className="text-sm font-semibold text-gray-700 mt-2">Cash</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.byMethod.CASH}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl">🏦</div>
                  <div className="text-sm font-semibold text-gray-700 mt-2">Bank Transfer</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.byMethod.BANK_TRANSFER}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl">💳</div>
                  <div className="text-sm font-semibold text-gray-700 mt-2">Card</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.byMethod.CARD}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl">💻</div>
                  <div className="text-sm font-semibold text-gray-700 mt-2">Online</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.byMethod.ONLINE}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{stats.totalPayments}</div>
                <div className="text-sm text-blue-700">Total Records</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-3xl font-bold text-green-600">
                  ₦{stats.totalAmount.toLocaleString()}
                </div>
                <div className="text-sm text-green-700">Total Amount</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-600">
                  ₦{stats.pendingAmount.toLocaleString()}
                </div>
                <div className="text-sm text-yellow-700">Pending</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-3xl font-bold text-red-600">
                  ₦{stats.failedAmount.toLocaleString()}
                </div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>

            {/* Payments Table */}
            {filteredPayments.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Admission #
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Class
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Receipt #
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment, idx) => (
                      <tr
                        key={payment.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {payment.student_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {payment.admission_no}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {payment.class_name}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-green-600">
                          ₦{payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                            {payment.method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              payment.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : payment.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {payment.receipt_number}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">No payment records found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
