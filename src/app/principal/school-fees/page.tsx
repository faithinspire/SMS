'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'

interface StudentFeeRecord {
  id: string
  student_id: string
  student_name: string
  admission_number: string
  class_name: string
  total_amount: number
  amount_paid: number
  balance: number
  payment_status: 'PAID' | 'PARTIAL' | 'PENDING'
  payment_date?: string
  term: string
}

export default function PrincipalSchoolFeesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [feeRecords, setFeeRecords] = useState<StudentFeeRecord[]>([])
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'PENDING'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [filterStatus])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'PRINCIPAL') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.school_id) {
        // Load school
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        setSchool(schoolData)

        // Load transactions (payment records)
        let query = supabase
          .from('transactions')
          .select(`
            id,
            student_id,
            amount,
            payment_method,
            status,
            created_at,
            students(full_name, admission_number),
            class_arm_combos(
              classes(name),
              arms(name)
            )
          `)
          .eq('school_id', currentUser.school_id)
          .eq('type', 'SCHOOL_FEE')

        if (filterStatus !== 'ALL') {
          query = query.eq('status', filterStatus)
        }

        const { data: transactionsData } = await query.order('created_at', { ascending: false })

        // Process and format the data
        const records: StudentFeeRecord[] = (transactionsData || []).map((tx: any) => ({
          id: tx.id,
          student_id: tx.student_id,
          student_name: tx.students?.full_name || 'Unknown',
          admission_number: tx.students?.admission_number || 'N/A',
          class_name: tx.class_arm_combos?.classes?.name 
            ? `${tx.class_arm_combos.classes.name} ${tx.class_arm_combos.arms?.name || ''}`
            : 'N/A',
          total_amount: 0,
          amount_paid: tx.amount || 0,
          balance: 0,
          payment_status: tx.status || 'PENDING',
          payment_date: tx.created_at,
          term: new Date(tx.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        }))

        setFeeRecords(records)
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = feeRecords.filter(record =>
    searchTerm === '' ||
    record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800'
      case 'PENDING':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTotalStats = () => {
    const stats = {
      totalStudents: new Set(feeRecords.map(r => r.student_id)).size,
      totalCollected: feeRecords.reduce((sum, r) => sum + r.amount_paid, 0),
      paidCount: feeRecords.filter(r => r.payment_status === 'PAID').length,
      partialCount: feeRecords.filter(r => r.payment_status === 'PARTIAL').length,
      pendingCount: feeRecords.filter(r => r.payment_status === 'PENDING').length,
    }
    return stats
  }

  const stats = getTotalStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading school fees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <StaffHeader
        staffName={user?.full_name || 'Principal'}
        schoolName={school?.name || 'School'}
        section="School Fees Management"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">💰 School Fees & Payment Records</h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Total Students</p>
            <p className="text-3xl font-bold text-purple-600">{stats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Amount Collected</p>
            <p className="text-2xl font-bold text-green-600">₦{stats.totalCollected.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Payments Completed</p>
            <p className="text-3xl font-bold text-blue-600">{stats.paidCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Pending Payments</p>
            <p className="text-3xl font-bold text-red-600">{stats.pendingCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search by Student Name or Admission No.
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Status</option>
                <option value="PAID">✅ Paid</option>
                <option value="PARTIAL">⚠️ Partial</option>
                <option value="PENDING">❌ Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold">#</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold">Student Name</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold hidden sm:table-cell">Admission No.</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold hidden lg:table-cell">Class</th>
                  <th className="px-4 sm:px-6 py-3 text-center font-semibold">Amount</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                      {searchTerm ? 'No matching records found' : 'No payment records available'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, idx) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 font-medium text-gray-900">{idx + 1}</td>
                      <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 truncate">{record.student_name}</td>
                      <td className="px-4 sm:px-6 py-4 text-gray-600 hidden sm:table-cell text-sm">{record.admission_number}</td>
                      <td className="px-4 sm:px-6 py-4 text-gray-600 hidden lg:table-cell text-sm">{record.class_name}</td>
                      <td className="px-4 sm:px-6 py-4 text-center font-bold text-purple-600">
                        ₦{record.amount_paid.toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${getStatusColor(record.payment_status)}`}>
                          {record.payment_status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-gray-600 hidden sm:table-cell text-sm">
                        {record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
