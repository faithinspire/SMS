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
      {type === 'STAFF_SALARY' ? 'Staff Salary' : 'Student Payment'}
    </span>
  )
}

const ConfirmationModal: React.FC<{
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  isDangerous?: boolean
}> = ({ title, message, onConfirm, onCancel, isLoading = false, isDangerous = false }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 text-white rounded ${
            isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {isLoading ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
)

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL')
  const [filterStatus, setFilterStatus] = useState<StatusType | 'ALL'>('ALL')
  const [schoolId, setSchoolId] = useState<string>('')
  const [modal, setModal] = useState<{
    type: 'update' | 'delete' | null
    transaction?: Transaction
  }>({ type: null })
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [newStatus, setNewStatus] = useState<StatusType>('PENDING')

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

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!schoolId) return

    try {
      setIsLoading(true)
      const { data, error } = await getSupabaseClient()
        .from('transactions')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    if (schoolId) {
      fetchTransactions()
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

  // Update transaction status
  const handleStatusUpdate = async (transactionId: string, status: StatusType) => {
    try {
      setIsActionLoading(true)
      const { error } = await getSupabaseClient()
        .from('transactions')
        .update({ status })
        .eq('id', transactionId)

      if (error) throw error

      setTransactions(transactions.map((t) =>
        t.id === transactionId ? { ...t, status } : t
      ))
      toast.success(`Transaction status updated to ${status}`)
      setModal({ type: null })
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast.error('Failed to update transaction status')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Delete transaction
  const handleDelete = async (transactionId: string) => {
    try {
      setIsActionLoading(true)
      const { error } = await getSupabaseClient()
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (error) throw error

      setTransactions(transactions.filter((t) => t.id !== transactionId))
      toast.success('Transaction deleted successfully')
      setModal({ type: null })
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error('Failed to delete transaction')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Calculate totals
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const completedAmount = filteredTransactions
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0)
  const pendingAmount = filteredTransactions
    .filter((t) => t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Transactions</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-blue-600">₦{totalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">{filteredTransactions.length} transactions</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">₦{completedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">₦{pendingAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Staff Salary</p>
          <p className="text-2xl font-bold text-purple-600">
            ₦{filteredTransactions
              .filter((t) => t.type === 'STAFF_SALARY')
              .reduce((sum, t) => sum + t.amount, 0)
              .toLocaleString('en-US', { maximumFractionDigits: 2 })}
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
          Total: {filteredTransactions.length} transactions
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
                <th className="text-left py-3 px-4">Invoice</th>
                <th className="text-left py-3 px-4">Purpose</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Method</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <TypeBadge type={transaction.type} />
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold">{transaction.recipient_name}</p>
                      <p className="text-sm text-gray-500">{transaction.recipient_email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{transaction.invoice_number || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm">{transaction.purpose}</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    ₦{transaction.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-sm">{transaction.payment_method}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {new Date(transaction.created_at).toLocaleDateString('en-US')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      {transaction.status !== 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setNewStatus('COMPLETED')
                            setModal({ type: 'update', transaction })
                          }}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          title="Mark as Completed"
                        >
                          ✓ Complete
                        </button>
                      )}
                      {transaction.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setNewStatus('PENDING')
                            setModal({ type: 'update', transaction })
                          }}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                          title="Mark as Pending"
                        >
                          ⟳ Pending
                        </button>
                      )}
                      <button
                        onClick={() => setModal({ type: 'delete', transaction })}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modal.type === 'update' && modal.transaction && (
        <ConfirmationModal
          title="Update Transaction Status"
          message={`Change transaction status to ${newStatus}?`}
          onConfirm={() => handleStatusUpdate(modal.transaction!.id, newStatus)}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
        />
      )}

      {modal.type === 'delete' && modal.transaction && (
        <ConfirmationModal
          title="Delete Transaction"
          message={`Delete this transaction for ₦${modal.transaction.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}? This action cannot be undone.`}
          onConfirm={() => handleDelete(modal.transaction!.id)}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
          isDangerous
        />
      )}
    </div>
  )
}

export default TransactionsPage
