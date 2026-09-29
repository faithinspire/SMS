'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { createClient } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'

let supabase: any = null

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient()
  }
  return supabase
}

interface StudentFeeRecord {
  id: string
  student_id: string
  student_name: string
  admission_number: string
  class_name: string
  amount_paid: number
  payment_status: 'PAID' | 'PARTIAL' | 'PENDING'
  payment_date?: string
  payment_method?: string
}

export default function SchoolAdminSchoolFeesPage() {
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

      if (!currentUser || currentUser.role !== 'SCHOOL_ADMIN') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (!currentUser.school_id) {
        setFeeRecords([])
        setLoading(false)
        return
      }

      // Load school
      const { data: schoolData } = await getSupabaseClient()
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      setSchool(schoolData)

      // Load all student payment transactions from the transactions table
      let query = getSupabaseClient()
        .from('transactions')
        .select(`
          id,
          recipient_id,
          recipient_name,
          amount,
          payment_method,
          status,
          type,
          created_at
        `)
        .eq('school_id', currentUser.school_id)
        .eq('type', 'STUDENT_PAYMENT')

      if (filterStatus !== 'ALL') {
        query = query.eq('status', filterStatus)
      }

      const { data: transactionsData, error: txError } = await query.order('created_at', { ascending: false })

      if (txError) {
        console.error('Error fetching transactions:', txError)
        setFeeRecords([])
        setLoading(false)
        return
      }

      // For each transaction, fetch the student record to get admission number and class
      const enrichedRecords: StudentFeeRecord[] = []

      for (const tx of transactionsData || []) {
        try {
          // Fetch student details using recipient_id
          const { data: studentData } = await getSupabaseClient()
            .from('students')
            .select(`
              id,
              admission_number,
              class_arm_combo:class_arm_combo_id (
                class:class_id (
                  name
                ),
                arm:arm_id (
                  name
                )
              ),
              user:user_id (
                full_name
              )
            `)
            .eq('id', tx.recipient_id)
            .single()

          const className = studentData?.class_arm_combo
            ? `${studentData.class_arm_combo.class?.name} ${studentData.class_arm_combo.arm?.name}`
            : 'N/A'

          enrichedRecords.push({
            id: tx.id,
            student_id: tx.recipient_id,
            student_name: studentData?.user?.full_name || tx.recipient_name || 'Unknown',
            admission_number: studentData?.admission_number || 'N/A',
            class_name: className,
            amount_paid: tx.amount || 0,
            payment_status: tx.status === 'COMPLETED' ? 'PAID' : tx.status === 'PENDING' ? 'PENDING' : 'PARTIAL',
            payment_date: tx.created_at,
            payment_method: tx.payment_method || 'N/A',
          })
        } catch (err) {
          console.warn('Error enriching transaction record:', err)
          enrichedRecords.push({
            id: tx.id,
            student_id: tx.recipient_id,
            student_name: tx.recipient_name || 'Unknown',
            admission_number: 'N/A',
            class_name: 'N/A',
            amount_paid: tx.amount || 0,
            payment_status: tx.status || 'PENDING',
            payment_date: tx.created_at,
            payment_method: tx.payment_method || 'N/A',
          })
        }
      }

      setFeeRecords(enrichedRecords)
    } catch (error) {
      console.error('Load error:', error)
      setFeeRecords([])
    } finally {
      setLoading(false)
    }
  }

  // Filter records based on search term
  const filteredRecords = feeRecords.filter(record => {
    const matchesSearch = !searchTerm || 
      record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Calculate summary
  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount_paid, 0)
  const paidAmount = filteredRecords.filter(r => r.payment_status === 'PAID').reduce((sum, r) => sum + r.amount_paid, 0)
  const pendingAmount = filteredRecords.filter(r => r.payment_status === 'PENDING').reduce((sum, r) => sum + r.amount_paid, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading school fees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffHeader staffName={user?.full_name || 'Admin'} schoolName={school?.name || 'School'} section="School Fees" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">💰 School Fees Management</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-blue-600">₦{totalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500 mt-1">{filteredRecords.length} transactions</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Paid</p>
            <p className="text-3xl font-bold text-green-600">₦{paidAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">₦{pendingAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by student name or admission number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
          </select>
        </div>

        {/* Fee Records Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No fee records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Student Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Admission #</th>
                    <th className="text-left py-3 px-4 font-semibold">Class</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Payment Method</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-900">{record.student_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{record.admission_number}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{record.class_name}</td>
                      <td className="py-3 px-4 text-right font-semibold">₦{record.amount_paid.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          record.payment_status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : record.payment_status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {record.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{record.payment_method}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(record.payment_date || '').toLocaleDateString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
