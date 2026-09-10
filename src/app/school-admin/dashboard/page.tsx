'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { SchoolService } from '@/services/school.service'
import { UserRegistrationService } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import StaffHeader from '@/components/StaffHeader'
import { TeacherRegistrationModal } from '@/components/admin/TeacherRegistrationModal'
import StudentRegistrationModal from '@/components/admin/StudentRegistrationModal'
import StaffRegistrationModal from '@/components/admin/StaffRegistrationModal'
import EditStaffModal from '@/components/admin/EditStaffModal'
import EditStudentModal from '@/components/admin/EditStudentModal'
import AdmissionLetterModal from '@/components/admin/AdmissionLetterModal'
import GenerateLetterModal from '@/components/admin/GenerateLetterModal'

export default function SchoolAdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'staff' | 'students' | 'transactions' | 'broadcast' | 'settings'>('staff')
  const [staffMembers, setStaffMembers] = useState([])
  const [students, setStudents] = useState([])
  const [transactions, setTransactions] = useState([])
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastRecipientRole, setBroadcastRecipientRole] = useState<'TEACHER' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'ACCOUNTANT' | 'OTHER_STAFF' | 'ALL'>('ALL')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [letterModal, setLetterModal] = useState<{
    isOpen: boolean
    type: 'EMPLOYMENT' | 'ADMISSION'
    recipientData: any
  }>({ isOpen: false, type: 'EMPLOYMENT', recipientData: null })
  const [admissionLetterStudentId, setAdmissionLetterStudentId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    type: 'STAFF' | 'STUDENT'
    id: string
    name: string
  }>({
    isOpen: false,
    type: 'STAFF',
    id: '',
    name: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadDashboard()
  }, [])

  useEffect(() => {
    localStorage.setItem('theme-mode', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || (currentUser.role !== 'SCHOOL_ADMIN' && currentUser.role !== 'ADMIN')) {
        console.log('❌ User role:', currentUser?.role)
        router.push('/landing')
        return
      }

      setUser(currentUser)
      console.log('✅ User authenticated:', currentUser.id)
      console.log('📍 School ID:', currentUser.school_id)

      // ✅ VALIDATE SCHOOL ID - ROOT CAUSE FIX #1
      if (!currentUser.school_id || currentUser.school_id.trim() === '') {
        setError('❌ School ID not found for this user. Please contact your administrator.')
        console.error('❌ User has no school_id assigned:', currentUser)
        setLoading(false)
        return
      }

      // Load school details
      if (currentUser.school_id) {
        try {
          console.log('🔄 Loading school...')
          const schoolData = await SchoolService.getSchoolById(currentUser.school_id)
          console.log('✅ School loaded:', schoolData?.name)
          setSchool(schoolData)
        } catch (schoolErr: any) {
          console.error('❌ Error loading school:', schoolErr.message)
          setError(`Failed to load school: ${schoolErr.message}`)
        }

        // Load staff and students
        try {
          console.log('🔄 Loading staff...')
          const staffList = await UserRegistrationService.getSchoolStaff(currentUser.school_id)
          console.log('✅ Staff loaded:', staffList.length)
          setStaffMembers(staffList)
        } catch (staffErr: any) {
          console.error('❌ Error loading staff:', staffErr)
        }

        try {
          console.log('🔄 Loading students...')
          const studentList = await UserRegistrationService.getSchoolStudents(currentUser.school_id)
          console.log('✅ Students loaded:', studentList.length)
          setStudents(studentList)
        } catch (studentErr: any) {
          console.error('❌ Error loading students:', studentErr)
        }

        // Load transactions
        try {
          console.log('🔄 Loading transactions...')
          const { data: transactionsData, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('school_id', currentUser.school_id)
            .order('created_at', { ascending: false })
            .limit(200)
          
          if (error) {
            // If table doesn't exist yet, just log it and continue
            if (error.code === 'PGRST205' || error.message?.includes('could not find the table')) {
              console.warn('⚠️  Transactions table not created yet. Please execute migration 031_create_transactions_table.sql')
              setTransactions([])
            } else {
              throw error
            }
          } else {
            console.log('✅ Transactions loaded:', transactionsData?.length || 0)
            setTransactions(transactionsData || [])
          }
        } catch (transErr: any) {
          console.error('❌ Error loading transactions:', transErr)
          // Don't crash the page - just show empty transactions
          setTransactions([])
        }
      }
    } catch (err: any) {
      console.error('❌ Dashboard load error:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleDelete = async (type: 'STAFF' | 'STUDENT', id: string) => {
    try {
      setDeletingId(id)
      const endpoint = type === 'STAFF' ? '/api/admin/delete-staff' : '/api/admin/delete-student'
      const key = type === 'STAFF' ? 'staffId' : 'studentId'

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(`Error: ${errorData.error || 'Failed to delete'}`)
        return
      }

      const result = await response.json()
      setError(result.message || `${type} deleted successfully`)

      // Reload data based on type
      if (type === 'STAFF') {
        const staffList = await UserRegistrationService.getSchoolStaff(user?.school_id || '')
        setStaffMembers(staffList)
      } else {
        const studentList = await UserRegistrationService.getSchoolStudents(user?.school_id || '')
        setStudents(studentList)
      }

      setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(`Error: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim() || !user?.school_id) {
      setError('❌ Please enter a message')
      return
    }

    try {
      setSendingBroadcast(true)
      setError('')

      const response = await fetch('/api/admin/send-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user.school_id,
          message: broadcastMessage,
          recipient_role: broadcastRecipientRole,
          sent_by: user.id,
          sent_by_name: user.full_name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send broadcast')
      }

      setError('✅ Broadcast message sent successfully!')
      setBroadcastMessage('')
      setTimeout(() => setError(''), 3000)
    } catch (err: any) {
      console.error('Broadcast error:', err)
      setError(`❌ Error: ${err.message}`)
    } finally {
      setSendingBroadcast(false)
    }
  }

  const bgClass = darkMode
    ? 'from-slate-950 via-purple-900 to-slate-900'
    : 'from-blue-50 via-purple-50 to-indigo-100'
  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border-slate-700/50'
    : 'bg-white/90 backdrop-blur border-purple-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className={textClass}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass} transition-all duration-300`}>

      {/* Professional Staff Header */}
      <StaffHeader
        staffName={user?.full_name || 'School Admin'}
        schoolName={school?.name || 'School'}
        section="Administration Dashboard"
      />

      {/* Navigation Tabs */}
      <div className={`${cardClass} border-b shadow-lg sticky top-16 z-30`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['staff', 'students', 'transactions', 'broadcast'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-bold transition-all whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                  activeTab === tab
                    ? `bg-gradient-to-r ${darkMode ? 'from-purple-500 to-pink-500' : 'from-blue-600 to-purple-600'} text-white shadow-lg`
                    : `${cardClass} ${textClass} hover:shadow-lg`
                }`}
              >
                {tab === 'staff' && '👨‍🏫 Staff'}
                {tab === 'students' && '👨‍🎓 Students'}
                {tab === 'transactions' && '💳 Transactions'}
                {tab === 'broadcast' && '📢 Broadcasts'}
              </button>
            ))}
            <button
              onClick={() => router.push('/school-admin/broadcasts')}
              className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:from-purple-700 hover:to-pink-700 whitespace-nowrap text-sm sm:text-base flex-shrink-0"
            >
              📤 Send Message
            </button>
            <button
              onClick={() => router.push('/school-admin/results')}
              className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:from-green-700 hover:to-emerald-700 whitespace-nowrap text-sm sm:text-base flex-shrink-0"
            >
              📊 Results
            </button>
            <button
              onClick={() => router.push('/school-admin/school-fees')}
              className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg hover:from-blue-700 hover:to-cyan-700 whitespace-nowrap text-sm sm:text-base flex-shrink-0"
            >
              💰 School Fees
            </button>
            <button
              onClick={() => router.push('/school-admin/records')}
              className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg hover:from-orange-600 hover:to-red-700 whitespace-nowrap text-sm sm:text-base flex-shrink-0"
            >
              📋 Records
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24">
        {/* Error Message */}
        {error && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              error.includes('successfully')
                ? 'bg-green-100/20 text-green-400 border-green-500/30'
                : 'bg-red-100/20 text-red-400 border-red-500/30'
            }`}
          >
            {error}
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === 'staff' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h2 className={`text-2xl font-bold ${textClass}`}>Staff & Teachers Management</h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowTeacherModal(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg text-sm sm:text-base"
                >
                  + Register Teacher
                </button>
                <button
                  onClick={() => setShowStaffModal(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg text-sm sm:text-base"
                >
                  + Register Staff
                </button>
              </div>
            </div>

            {/* Staff Grid - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {staffMembers.length === 0 ? (
                <div className={`${cardClass} rounded-lg shadow-lg p-8 text-center col-span-full ${textClass}`}>
                  <p className="text-lg">No staff members registered yet</p>
                </div>
              ) : (
                staffMembers.map((member: any) => (
                  <div key={member.id} className={`${cardClass} border rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all`}>
                    <div className="mb-4">
                      <h4 className={`text-lg sm:text-xl font-bold ${textClass}`}>{member.full_name}</h4>
                      <p className={`text-sm ${textClass} opacity-75`}>{member.role}</p>
                    </div>
                    <div className="space-y-2 mb-4 text-sm">
                      <p><strong>Email:</strong> {member.email}</p>
                      <p><strong>Status:</strong> <span className="px-2 py-1 bg-green-100/30 text-green-400 rounded text-xs font-semibold">✓ Active</span></p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => setEditingStaffId(member.id)}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setLetterModal({
                          isOpen: true,
                          type: 'EMPLOYMENT',
                          recipientData: member,
                        })}
                        className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-semibold transition-all"
                      >
                        📄 Letter
                      </button>
                      <button
                        onClick={() => setDeleteConfirmation({
                          isOpen: true,
                          type: 'STAFF',
                          id: member.id,
                          name: member.full_name,
                        })}
                        className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-semibold transition-all"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h2 className={`text-2xl font-bold ${textClass}`}>Students Management</h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowStudentModal(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg text-sm sm:text-base"
                >
                  + Register Student
                </button>
                <button
                  onClick={() => router.push('/school-admin/records')}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg text-sm sm:text-base"
                >
                  📋 View Records
                </button>
              </div>
            </div>

            {/* Students Grid - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {students.length === 0 ? (
                <div className={`${cardClass} rounded-lg shadow-lg p-8 text-center col-span-full ${textClass}`}>
                  <p className="text-lg">No students registered yet</p>
                </div>
              ) : (
                students.map((student: any) => (
                  <div key={student.id} className={`${cardClass} border rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all`}>
                    <div className="mb-4">
                      <h4 className={`text-lg sm:text-xl font-bold ${textClass}`}>{student.full_name}</h4>
                      <p className={`text-sm ${textClass} opacity-75`}>Admission #: {student.admission_number || 'N/A'}</p>
                    </div>
                    <div className="space-y-2 mb-4 text-sm">
                      <p><strong>Email:</strong> {student.email}</p>
                      <p><strong>Status:</strong> <span className="px-2 py-1 bg-blue-100/30 text-blue-400 rounded text-xs font-semibold">✓ Active</span></p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setEditingStudentId(student.id)}
                        className="w-full px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setLetterModal({
                          isOpen: true,
                          type: 'ADMISSION',
                          recipientData: student,
                        })}
                        className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold transition-all"
                      >
                        🎓 Letter
                      </button>
                      <button
                        onClick={() => setDeleteConfirmation({
                          isOpen: true,
                          type: 'STUDENT',
                          id: student.id,
                          name: `${student.full_name} (${student.admission_number})`,
                        })}
                        className="w-full px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-semibold transition-all"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className={`${cardClass} border rounded-lg shadow-xl overflow-hidden`}>
            <div className={`px-6 py-4 ${darkMode ? 'bg-slate-700/50' : 'bg-purple-100/50'} border-b`}>
              <h3 className={`text-lg font-bold ${textClass}`}>Accountant Transactions ({transactions.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${darkMode ? 'bg-slate-700/30' : 'bg-purple-50/50'} border-b`}>
                    <th className={`px-4 sm:px-6 py-4 text-left font-semibold text-xs sm:text-base ${textClass}`}>Date</th>
                    <th className={`px-4 sm:px-6 py-4 text-left font-semibold text-xs sm:text-base ${textClass}`}>Type</th>
                    <th className={`px-4 sm:px-6 py-4 text-left font-semibold text-xs sm:text-base ${textClass}`}>Recipient</th>
                    <th className={`px-4 sm:px-6 py-4 text-left font-semibold text-xs sm:text-base ${textClass}`}>Purpose</th>
                    <th className={`px-4 sm:px-6 py-4 text-center font-semibold text-xs sm:text-base ${textClass}`}>Amount</th>
                    <th className={`px-4 sm:px-6 py-4 text-left font-semibold text-xs sm:text-base ${textClass}`}>Method</th>
                    <th className={`px-4 sm:px-6 py-4 text-left font-semibold text-xs sm:text-base ${textClass}`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`px-6 py-8 text-center ${textClass}`}>
                        No transactions recorded yet
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction: any) => (
                      <tr key={transaction.id} className={`border-b ${darkMode ? 'hover:bg-slate-700/20' : 'hover:bg-purple-50/30'}`}>
                        <td className={`px-6 py-4 ${textClass}`}>
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            transaction.type === 'STAFF_SALARY'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {transaction.type === 'STAFF_SALARY' ? '👨‍💼 Salary' : '👨‍🎓 Student'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 font-semibold ${textClass}`}>
                          {transaction.recipient_name}
                        </td>
                        <td className={`px-6 py-4 ${textClass}`}>
                          {transaction.purpose}
                        </td>
                        <td className={`px-6 py-4 text-center font-bold ${textClass}`}>
                          ₦{transaction.amount.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 text-sm ${textClass}`}>
                          {transaction.payment_method}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            transaction.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Broadcast Tab - Mobile Optimized */}
        {activeTab === 'broadcast' && (
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <div className={`${cardClass} border rounded-lg shadow-xl p-4 sm:p-6 mb-6`}>
              <h2 className={`text-xl sm:text-2xl font-bold mb-6 ${textClass}`}>📢 Send Broadcast Message</h2>
              
              <div className="space-y-4">
                {/* Recipient Role Dropdown - Full Width on Mobile */}
                <div>
                  <label className={`block text-xs sm:text-sm font-semibold mb-2 ${textClass}`}>
                    Send To (Staff Role):
                  </label>
                  <select
                    value={broadcastRecipientRole}
                    onChange={(e) => setBroadcastRecipientRole(e.target.value as any)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-sm sm:text-base ${
                      darkMode
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="ALL">🌐 All Staff</option>
                    <option value="TEACHER">👨‍🏫 Teachers</option>
                    <option value="PRINCIPAL">🎓 Principal</option>
                    <option value="HEAD_TEACHER">📚 Head Teacher</option>
                    <option value="ACCOUNTANT">💰 Accountant</option>
                    <option value="OTHER_STAFF">👥 Other Staff</option>
                  </select>
                </div>

                {/* Message Input - Full Width */}
                <div>
                  <label className={`block text-xs sm:text-sm font-semibold mb-2 ${textClass}`}>
                    Message:
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type your broadcast message here..."
                    rows={5}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-sm sm:text-base ${
                      darkMode
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <p className={`text-xs sm:text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Characters: {broadcastMessage.length}
                  </p>
                </div>

                {/* Send Button - Full Width */}
                <button
                  onClick={handleSendBroadcast}
                  disabled={sendingBroadcast || !broadcastMessage.trim()}
                  className="w-full px-4 sm:px-6 py-3 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingBroadcast ? '⏳ Sending...' : '📤 Send Broadcast'}
                </button>
              </div>
            </div>

            {/* Message Preview - Mobile Responsive */}
            {broadcastMessage && (
              <div className={`${cardClass} border rounded-lg shadow-xl p-4 sm:p-6`}>
                <h3 className={`text-lg font-bold mb-3 ${textClass}`}>📋 Message Preview:</h3>
                <div className={`p-4 rounded-lg text-sm sm:text-base ${darkMode ? 'bg-slate-700/30' : 'bg-purple-100/30'}`}>
                  <p className={`text-xs sm:text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    To: <span className="font-bold">{broadcastRecipientRole === 'ALL' ? 'All Staff' : broadcastRecipientRole}</span>
                  </p>
                  <p className={`whitespace-pre-wrap break-words ${textClass}`}>{broadcastMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={`${cardClass} border p-8 rounded-lg shadow-xl`}>
            <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>School Settings</h2>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-purple-100/30'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>School Name</p>
                <p className={`text-xl font-bold ${textClass}`}>{school?.name}</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-purple-100/30'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>School Email</p>
                <p className={`text-xl font-bold ${textClass}`}>{school?.email || 'Not set'}</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-purple-100/30'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>School Type</p>
                <p className={`text-xl font-bold ${textClass}`}>{school?.type || 'Both'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Teacher Registration Modal */}
      {user?.school_id && (
        <TeacherRegistrationModal
          schoolId={user.school_id}
          isOpen={showTeacherModal}
          onClose={() => setShowTeacherModal(false)}
          onSuccess={() => loadDashboard()}
        />
      )}

      {/* Student Registration Modal */}
      {user?.school_id && (
        <StudentRegistrationModal
          schoolId={user.school_id}
          isOpen={showStudentModal}
          onClose={() => setShowStudentModal(false)}
          onSuccess={() => loadDashboard()}
        />
      )}

      {/* Staff Registration Modal */}
      <StaffRegistrationModal
        schoolId={user?.school_id || ''}
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        onSuccess={() => loadDashboard()}
      />

      {/* Edit Staff Modal */}
      {editingStaffId && (
        <EditStaffModal
          staffId={editingStaffId}
          schoolId={user?.school_id || ''}
          isOpen={!!editingStaffId}
          onClose={() => setEditingStaffId(null)}
          onSuccess={() => {
            setEditingStaffId(null)
            loadDashboard()
          }}
        />
      )}

      {/* Edit Student Modal */}
      {editingStudentId && (
        <EditStudentModal
          studentId={editingStudentId}
          schoolId={user?.school_id || ''}
          isOpen={!!editingStudentId}
          onClose={() => setEditingStudentId(null)}
          onSuccess={() => {
            setEditingStudentId(null)
            loadDashboard()
          }}
        />
      )}

      {/* Generate Letter Modal */}
      <GenerateLetterModal
        type={letterModal.type}
        recipientData={letterModal.recipientData}
        schoolData={school}
        isOpen={letterModal.isOpen}
        onClose={() => setLetterModal({ isOpen: false, type: 'EMPLOYMENT', recipientData: null })}
      />

      {/* Admission Letter Modal */}
      {letterModal.type === 'ADMISSION' && letterModal.recipientData && (
        <AdmissionLetterModal
          studentId={letterModal.recipientData.id}
          isOpen={letterModal.isOpen}
          onClose={() => setLetterModal({ isOpen: false, type: 'EMPLOYMENT', recipientData: null })}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} border rounded-lg shadow-2xl max-w-md w-full p-6 animate-bounce`}>
            <h3 className={`text-xl font-bold mb-4 ${textClass}`}>
              ⚠️ Confirm Delete
            </h3>
            <p className={`${textClass} mb-2`}>
              Are you sure you want to delete this {deleteConfirmation.type.toLowerCase()}?
            </p>
            <p className={`text-lg font-semibold mb-6 ${deleteConfirmation.type === 'STAFF' ? 'text-orange-400' : 'text-blue-400'}`}>
              {deleteConfirmation.name}
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
              This action cannot be undone. All associated data will be deleted.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                disabled={deletingId === deleteConfirmation.id}
                className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmation.type, deleteConfirmation.id)}
                disabled={deletingId === deleteConfirmation.id}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                  deletingId === deleteConfirmation.id
                    ? 'bg-gray-500 text-white cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {deletingId === deleteConfirmation.id ? '🔄 Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

