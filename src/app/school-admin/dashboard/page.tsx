'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { SchoolService } from '@/services/school.service'
import { UserRegistrationService } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid top-level import issues
const StaffHeader = dynamic(() => import('@/components/StaffHeader'), { ssr: false })
const TeacherRegistrationModal = dynamic(() => import('@/components/admin/TeacherRegistrationModal').then(mod => ({ default: mod.TeacherRegistrationModal })), { ssr: false })
const StudentRegistrationModal = dynamic(() => import('@/components/admin/StudentRegistrationModal').then(mod => ({ default: mod.StudentRegistrationModal })), { ssr: false })
const StaffRegistrationModal = dynamic(() => import('@/components/admin/StaffRegistrationModal'), { ssr: false })
const EditStaffModal = dynamic(() => import('@/components/admin/EditStaffModal'), { ssr: false })
const EditStudentModal = dynamic(() => import('@/components/admin/EditStudentModal'), { ssr: false })
const AdmissionLetterModal = dynamic(() => import('@/components/admin/AdmissionLetterModal'), { ssr: false })
const GenerateLetterModal = dynamic(() => import('@/components/admin/GenerateLetterModal'), { ssr: false })

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

      if (!currentUser.school_id || currentUser.school_id.trim() === '') {
        setError('❌ School ID not found for this user. Please contact your administrator.')
        console.error('❌ User has no school_id assigned:', currentUser)
        setLoading(false)
        return
      }

      if (currentUser.school_id) {
        try {
          console.log('🔄 Loading school...')
          const schoolData = await SchoolService.getSchoolById(currentUser.school_id)
          console.log('✅ School loaded:', schoolData?.name)
          setSchool(schoolData)
        } catch (schoolErr: any) {
          console.error('❌ Error loading school:', schoolErr.message)
          setError(`Failed to load school: ${typeof schoolErr.message === 'string' ? schoolErr.message : 'Unknown error'}`)
        }

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

        try {
          console.log('🔄 Loading transactions...')
          const { data: transactionsData, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('school_id', currentUser.school_id)
            .order('created_at', { ascending: false })
            .limit(200)
          
          if (error) {
            if (error.code === 'PGRST205' || error.message?.includes('could not find the table')) {
              console.warn('⚠️ Transactions table not created yet.')
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
          setTransactions([])
        }
      }

      if (typeof error === 'string' && error.includes('✅')) {
        setTimeout(() => setError(''), 3000)
      }
    } catch (err: any) {
      console.error('❌ Dashboard load error:', err)
      setError(typeof err.message === 'string' ? err.message : 'Failed to load dashboard')
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
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        setError('Authentication required for deletion');
        return;
      }

      const endpoint = type === 'STAFF' ? `/api/school-admin/staff/${id}/delete` : `/api/school-admin/students/${id}/delete`

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(`❌ Error: ${typeof errorData.error === 'string' ? errorData.error : 'Failed to delete'}`)
        return
      }

      const result = await response.json()
      const successMessage = typeof result.message === 'string' ? result.message : `${type} deleted successfully`
      setError(`✅ ${successMessage}`)

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
    if (!user || !user.id || !user.school_id) {
      setError('❌ User information not fully loaded. Please wait and try again.')
      return
    }

    if (!broadcastMessage.trim()) {
      setError('❌ Please enter a message')
      return
    }

    try {
      setSendingBroadcast(true)
      setError('')

      const response = await fetch('/api/broadcasts/send-to-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user.school_id,
          message: broadcastMessage,
          recipient_role: broadcastRecipientRole,
          sender_id: user.id,
          sender_name: user.full_name || user.email || 'System Admin',
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
      <Suspense fallback={null}>
        <StaffHeader
          staffName={user?.full_name || 'School Admin'}
          schoolName={school?.name || 'School'}
          section="Administration Dashboard"
        />
      </Suspense>

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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24">
        {error && typeof error === 'string' && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              error.includes('successfully') || error.includes('✅')
                ? 'bg-green-100/20 text-green-400 border-green-500/30'
                : 'bg-red-100/20 text-red-400 border-red-500/30'
            }`}
          >
            {error}
          </div>
        )}

        {activeTab === 'staff' && (
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>Staff Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffMembers.length === 0 ? (
                <div className={`${cardClass} rounded-lg shadow-lg p-8 text-center col-span-full ${textClass}`}>
                  <p>No staff members registered yet</p>
                </div>
              ) : (
                staffMembers.map((member: any) => (
                  <div key={member.id} className={`${cardClass} border rounded-lg shadow-lg p-4`}>
                    <h4 className={`text-lg font-bold ${textClass}`}>{member.full_name}</h4>
                    <p className={`text-sm ${textClass} opacity-75`}>{member.role}</p>
                    <p className="text-sm mt-2">{member.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>Students Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.length === 0 ? (
                <div className={`${cardClass} rounded-lg shadow-lg p-8 text-center col-span-full ${textClass}`}>
                  <p>No students registered yet</p>
                </div>
              ) : (
                students.map((student: any) => (
                  <div key={student.id} className={`${cardClass} border rounded-lg shadow-lg p-4`}>
                    <h4 className={`text-lg font-bold ${textClass}`}>{student.full_name}</h4>
                    <p className={`text-sm ${textClass} opacity-75`}>Admission #: {student.admission_number || 'N/A'}</p>
                    <p className="text-sm mt-2">{student.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className={`${cardClass} border rounded-lg shadow-xl p-6`}>
            <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>Transactions</h2>
            {transactions.length === 0 ? (
              <p className={textClass}>No transactions recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'bg-slate-700/30' : 'bg-purple-50/50'}`}>
                      <th className={`text-left py-2 px-2 font-semibold ${textClass}`}>Date</th>
                      <th className={`text-left py-2 px-2 font-semibold ${textClass}`}>Recipient</th>
                      <th className={`text-left py-2 px-2 font-semibold ${textClass}`}>Amount</th>
                      <th className={`text-left py-2 px-2 font-semibold ${textClass}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t: any) => (
                      <tr key={t.id} className={`border-b ${darkMode ? 'hover:bg-slate-700/20' : 'hover:bg-purple-50/30'}`}>
                        <td className="py-2 px-2">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="py-2 px-2">{t.recipient_name}</td>
                        <td className="py-2 px-2">₦{t.amount.toLocaleString()}</td>
                        <td className="py-2 px-2">{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className={`${cardClass} border rounded-lg shadow-xl p-6`}>
            <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>Send Broadcast</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${textClass}`}>Send To:</label>
                <select
                  value={broadcastRecipientRole}
                  onChange={(e) => setBroadcastRecipientRole(e.target.value as any)}
                  className={`w-full px-4 py-2 rounded-lg border-2 ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="ALL">All Staff</option>
                  <option value="TEACHER">Teachers</option>
                  <option value="PRINCIPAL">Principal</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${textClass}`}>Message:</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={5}
                  className={`w-full px-4 py-2 rounded-lg border-2 ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <button
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast || !broadcastMessage.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50"
              >
                {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
