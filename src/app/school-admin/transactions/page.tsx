'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'

let supabase: any = null

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient()
  }
  return supabase
}

interface Transaction {
  id: string
  school_id: string
  type: 'STAFF_SALARY' | 'STUDENT_PAYMENT'
  recipient_id: string
  recipient_name: string
  recipient_email: string | null
  recipient_phone: string | null
  amount: number
  purpose: string
  payment_method: string
  invoice_number: string | null
  notes: string | null
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  created_at: string
  updated_at: string
}

type StatusType = 'COMPLETED' | 'PENDING' | 'FAILED'
type TransactionType = 'STAFF_SALARY' | 'STUDENT_PAYMENT'

const StatusBadge: React.FC<{ status: StatusType }> = ({ status }) => {
  const variants: Record<StatusType, string> = {
    COMPLETED: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${variants[status]}`}>
      {status}
    </span>
  )
}

const TypeBadge: React.FC<{ type: TransactionType }> = ({ type }) => {
  const variants: Record<TransactionType, string> = {
    STAFF_SALARY: 'bg-blue-100 text-blue-800',
    STUDENT_PAYMENT: 'bg-purple-100 text-purple-800',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${variants[type]}`}>
      {type === 'STAFF_SALARY' ? '💼 Salary' : '📚 Payment'}
    </span>
  )
}

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL')
  const [filterStatus, setFilterStatus] = useState<StatusType | 'ALL'>('ALL')
  const [schoolId, setSchoolId] = useState<string>('')

  // Get current user's school
  useEffect(() => {
    const getCurrentSchool = async () => {
      try {
        const { data: { user } } = await getSupabaseClient().auth.getUser()
        if (!user) return

        const { data: userProfile } = await getSupabaseClient()
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          setSchoolId(userProfile.school_id)
        }
      } catch (error) {
        console.error('Error getting school:', error)
      }
    }

    getCurrentSchool()
  }, [])

  // Fetch transactions with real-time updates
  const fetchTransactions = useCallback(async () => {
    if (!schoolId) return

    try {
      setIsLoading(true)
      console.log('[Transactions] Fetching for school:', schoolId)

      const { data, error } = await getSupabaseClient()
        .from('transactions')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Transactions] Query error:', error)
        throw error
      }

      console.log('[Transactions] Found:', data?.length)
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Failed to load transactions')
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    if (schoolId) {
      fetchTransactions()

      // Set up real-time subscription
      const channel = getSupabaseClient()
        .channel(`transactions:${schoolId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `school_id=eq.${schoolId}`,
          },
          () => {
            console.log('[Transactions] Real-time update received')
            fetchTransactions()
          }
        )
        .subscribe()

      return () => {
        getSupabaseClient().removeChannel(channel)
      }
    }
  }, [schoolId, fetchTransactions])

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'ALL' || transaction.type === filterType
    const matchesStatus = filterStatus === 'ALL' || transaction.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  // Calculate totals
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const completedAmount = filteredTransactions
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0)
  const pendingAmount = filteredTransactions
    .filter((t) => t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0)
  const salaryAmount = filteredTransactions
    .filter((t) => t.type === 'STAFF_SALARY')
    .reduce((sum, t) => sum + t.amount, 0)
  const paymentAmount = filteredTransactions
    .filter((t) => t.type === 'STUDENT_PAYMENT')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">💳 Transactions Management</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-blue-600">
            ₦{totalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{filteredTransactions.length} transactions</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            ₦{completedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            ₦{pendingAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Staff Salaries</p>
          <p className="text-2xl font-bold text-purple-600">
            ₦{salaryAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Student Payments</p>
          <p className="text-2xl font-bold text-indigo-600">
            ₦{paymentAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by name, email, or invoice..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TransactionType | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Types</option>
          <option value="STAFF_SALARY">Staff Salary</option>
          <option value="STUDENT_PAYMENT">Student Payment</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusType | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <div className="text-sm text-gray-600 flex items-center">
          {filteredTransactions.length} transactions
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading transactions...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No transactions found. Try adjusting your search or filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Recipient</th>
                <th className="text-left py-3 px-4">Contact</th>
                <th className="text-left py-3 px-4">Purpose</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Method</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <TypeBadge type={transaction.type} />
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900">{transaction.recipient_name}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <p>{transaction.recipient_email}</p>
                    <p>{transaction.recipient_phone}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{transaction.purpose}</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    ₦{transaction.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-sm">{transaction.payment_method}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(transaction.created_at).toLocaleDateString('en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TransactionsPage
