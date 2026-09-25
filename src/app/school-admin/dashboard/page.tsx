'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { SchoolService } from '@/services/school.service'
import { UserRegistrationService } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import dynamic from 'next/dynamic'

// Dynamically import components
const StaffHeader = dynamic(() => import('@/components/StaffHeader'), { ssr: false })
const TeacherRegistrationModal = dynamic(() => import('@/components/admin/TeacherRegistrationModal').then(mod => ({ default: mod.TeacherRegistrationModal })), { ssr: false })
const StudentRegistrationModal = dynamic(() => import('@/components/admin/StudentRegistrationModal').then(mod => ({ default: mod.StudentRegistrationModal })), { ssr: false })
const StaffRegistrationModal = dynamic(() => import('@/components/admin/StaffRegistrationModal'), { ssr: false })
const EditStaffModal = dynamic(() => import('@/components/admin/EditStaffModal'), { ssr: false })
const EditStudentModal = dynamic(() => import('@/components/admin/EditStudentModal'), { ssr: false })
const AdmissionLetterModal = dynamic(() => import('@/components/admin/AdmissionLetterModal'), { ssr: false })
const GenerateLetterModal = dynamic(() => import('@/components/admin/GenerateLetterModal'), { ssr: false })

interface ClassWithStudents {
  id: string
  class_name: string
  arm_name: string
  student_count: number
  students: any[]
}

interface Session {
  id: string
  session_year: string
  is_active: boolean
}

interface Term {
  id: string
  session_id: string
  term_name: string
  term_number: number
  is_active: boolean
}

export default function SchoolAdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'students' | 'results' | 'transactions' | 'broadcast'>('overview')

  // Staff & Student Management
  const [staffMembers, setStaffMembers] = useState([])
  const [students, setStudents] = useState([])
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [letterModal, setLetterModal] = useState<{ isOpen: boolean; type: 'EMPLOYMENT' | 'ADMISSION'; recipientData: any }>({ isOpen: false, type: 'EMPLOYMENT', recipientData: null })
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; type: 'STAFF' | 'STUDENT'; id: string; name: string }>({ isOpen: false, type: 'STAFF', id: '', name: '' })

  // Results Management
  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null)
  const [classes, setClasses] = useState<ClassWithStudents[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedClassData, setSelectedClassData] = useState<ClassWithStudents | null>(null)
  const [loadingClasses, setLoadingClasses] = useState(false)

  // Transactions & Broadcasts
  const [transactions, setTransactions] = useState([])
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastRecipientRole, setBroadcastRecipientRole] = useState<'TEACHER' | 'STUDENT' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'ACCOUNTANT' | 'STAFF' | 'ALL'>('ALL')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

  // Initialize
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load terms when session changes
  useEffect(() => {
    if (selectedSession) {
      const sessionTerms = terms.filter((t) => t.session_id === selectedSession)
      if (sessionTerms.length > 0) {
        setSelectedTerm(sessionTerms[0].id)
      }
    }
  }, [selectedSession])

  // Load classes when term changes
  useEffect(() => {
    if (selectedTerm && user?.school_id && activeTab === 'results') {
      loadClassesForTerm(user.school_id, selectedTerm)
    }
  }, [selectedTerm, user?.school_id, activeTab])

  // Auto-select first class
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id)
      setSelectedClassData(classes[0])
    }
  }, [classes])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError('')

      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser || (currentUser.role !== 'SCHOOL_ADMIN' && currentUser.role !== 'ADMIN')) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (!currentUser.school_id) {
        setError('School ID not found')
        return
      }

      // Load school info
      const schoolData = await SchoolService.getSchoolById(currentUser.school_id)
      setSchool(schoolData)

      // Ensure school data exists
      try {
        await fetch(`/api/results/ensure-school-data?schoolId=${currentUser.school_id}`, { method: 'POST' })
      } catch (err) {
        console.warn('Could not ensure school data')
      }

      // Load sessions and terms
      const response = await fetch(`/api/results/school-sessions-and-terms?schoolId=${currentUser.school_id}`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
        setTerms(data.terms || [])
        if (data.sessions?.length > 0) {
          setSelectedSession(data.sessions[0].id)
        }
      }

      // Load staff and students with error resilience
      try {
        console.log('[Dashboard] Loading staff and students...')
        const staffList = await UserRegistrationService.getSchoolStaff(currentUser.school_id)
        const studentList = await UserRegistrationService.getSchoolStudents(currentUser.school_id)
        
        console.log('[Dashboard] Staff loaded:', staffList?.length || 0)
        console.log('[Dashboard] Students loaded:', studentList?.length || 0)
        
        setStaffMembers(staffList || [])
        setStudents(studentList || [])
      } catch (loadErr: any) {
        console.error('[Dashboard] Staff/Student load error:', loadErr)
        // Set empty arrays if loading fails
        setStaffMembers([])
        setStudents([])
      }

      // Load transactions
      try {
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('created_at', { ascending: false })
          .limit(200)
        setTransactions(transactionsData || [])
      } catch (err) {
        console.warn('Could not load transactions')
        setTransactions([])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadClassesForTerm = async (schoolId: string, termId: string) => {
    try {
      setLoadingClasses(true)
      const response = await fetch(`/api/results/school-classes-and-students?schoolId=${schoolId}&termId=${termId}&t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
        setSelectedClass(null)
        setSelectedClassData(null)
      }
    } catch (err) {
      console.error('Error loading classes:', err)
      setClasses([])
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleDelete = async (type: 'STAFF' | 'STUDENT', id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const endpoint = type === 'STAFF' ? `/api/school-admin/staff/${id}/delete` : `/api/school-admin/students/${id}/delete`
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(`Error: ${errorData.error}`)
        return
      }

      setError(`✅ ${type} deleted successfully`)
      if (type === 'STAFF') {
        const staffList = await UserRegistrationService.getSchoolStaff(user?.school_id || '')
        setStaffMembers(staffList)
      } else {
        const studentList = await UserRegistrationService.getSchoolStudents(user?.school_id || '')
        setStudents(studentList)
      }
      setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })
      setTimeout(() => setError(''), 3000)
    } catch (err: any) {
      setError(`Error: ${err.message}`)
    }
  }

  const handleSendBroadcast = async () => {
    if (!user || !user.id || !user.school_id || !broadcastMessage.trim()) {
      setError('Missing required information')
      return
    }

    try {
      setSendingBroadcast(true)
      const response = await fetch('/api/broadcasts/send-to-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user.school_id,
          message: broadcastMessage,
          recipient_role: broadcastRecipientRole,
          sender_id: user.id,
          sender_name: user.full_name || 'System Admin',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send')
      }

      setError('✅ Broadcast sent successfully!')
      setBroadcastMessage('')
      setTimeout(() => setError(''), 3000)
    } catch (err: any) {
      setError(`Error: ${err.message}`)
    } finally {
      setSendingBroadcast(false)
    }
  }

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-100 text-green-800'
      case 'Very Good': return 'bg-blue-100 text-blue-800'
      case 'Good': return 'bg-cyan-100 text-cyan-800'
      case 'Fair': return 'bg-yellow-100 text-yellow-800'
      case 'Poor': return 'bg-orange-100 text-orange-800'
      case 'Very Poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Suspense fallback={null}>
        <StaffHeader
          staffName={user?.full_name || 'School Administrator'}
          schoolName={school?.name || 'School'}
          section="Administration Center"
        />
      </Suspense>

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-30 bg-white shadow-md border-b border-gray-200 overflow-x-auto">
        <div className="min-w-max md:max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'staff', label: '👨‍🏫 Staff', icon: '👨‍🏫' },
              { id: 'students', label: '👨‍🎓 Students', icon: '👨‍🎓' },
              { id: 'results', label: '📈 Results', icon: '📈' },
              { id: 'transactions', label: '💳 Transactions', icon: '💳' },
              { id: 'broadcast', label: '📢 Broadcast', icon: '📢' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2 sm:px-4 py-3 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap border-b-4 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className={`mb-6 p-4 rounded-lg border ${error.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {error}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
              <p className="text-gray-600 text-sm font-semibold">Total Staff</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{staffMembers.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
              <p className="text-gray-600 text-sm font-semibold">Total Students</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{students.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-600">
              <p className="text-gray-600 text-sm font-semibold">Transactions</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{transactions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-600">
              <p className="text-gray-600 text-sm font-semibold">School</p>
              <p className="text-lg font-bold text-orange-600 mt-2 truncate">{school?.name || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === 'staff' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Staff Management</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button onClick={() => setShowTeacherModal(true)} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base">
                  + Register Teacher
                </button>
                <button onClick={() => setShowStaffModal(true)} className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm sm:text-base">
                  + Register Staff
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staffMembers.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                  <p className="text-lg">No staff members registered yet</p>
                </div>
              ) : (
                staffMembers.map((member: any) => (
                  <div key={member.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900">{member.full_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{member.role}</p>
                    <p className="text-sm text-gray-600 mt-2">{member.email}</p>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditingStaffId(member.id)} className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold">
                        ✏️ Edit
                      </button>
                      <button onClick={() => setDeleteConfirmation({ isOpen: true, type: 'STAFF', id: member.id, name: member.full_name })} className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-semibold">
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
        {activeTab === 'students' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Students Management</h2>
              <button onClick={() => setShowStudentModal(true)} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base">
                + Register Student
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                  <p className="text-lg">No students registered yet</p>
                </div>
              ) : (
                students.map((student: any) => (
                  <div key={student.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900">{student.full_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Admission #: {student.admission_number || 'N/A'}</p>
                    <p className="text-sm text-gray-600 mt-2">{student.email}</p>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditingStudentId(student.id)} className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold">
                        ✏️ Edit
                      </button>
                      <button onClick={() => setDeleteConfirmation({ isOpen: true, type: 'STUDENT', id: student.id, name: student.full_name })} className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-semibold">
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Results Tab - International Standard */}
        {activeTab === 'results' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📊 Student Results & Performance Analysis</h2>

            {/* Session and Term Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Session:</label>
                <select
                  value={selectedSession || ''}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                >
                  <option value="">-- Select Session --</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.session_year} {session.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Term:</label>
                <select
                  value={selectedTerm || ''}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  disabled={!selectedSession}
                >
                  <option value="">-- Select Term --</option>
                  {terms.filter((t) => t.session_id === selectedSession).map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.term_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Classes List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                    <h3 className="text-lg font-bold">Classes ({classes.length})</h3>
                  </div>
                  {loadingClasses ? (
                    <div className="p-6 text-center text-gray-600">Loading...</div>
                  ) : classes.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">No classes found</div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      <div className="divide-y">
                        {classes.map((cls) => (
                          <button
                            key={cls.id}
                            onClick={() => {
                              setSelectedClass(cls.id)
                              setSelectedClassData(cls)
                            }}
                            className={`w-full text-left p-4 hover:bg-blue-50 transition-colors border-l-4 ${
                              selectedClass === cls.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <h4 className="font-bold text-gray-900">{cls.class_name} {cls.arm_name}</h4>
                            <p className="text-xs text-gray-600 mt-1">👥 {cls.student_count} students</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Display */}
              <div className="lg:col-span-3">
                {selectedClassData ? (
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                      <h3 className="text-2xl font-bold">{selectedClassData.class_name} {selectedClassData.arm_name}</h3>
                      <p className="text-sm text-blue-100 mt-1">📊 {selectedClassData.student_count} Students</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="px-6 py-3 text-left font-bold text-gray-900">#</th>
                            <th className="px-6 py-3 text-left font-bold text-gray-900">Student Name</th>
                            <th className="px-6 py-3 text-left font-bold text-gray-900">Admission #</th>
                            <th className="px-6 py-3 text-center font-bold text-gray-900">Overall Score</th>
                            <th className="px-6 py-3 text-left font-bold text-gray-900">Performance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedClassData.students.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                                No students in this class
                              </td>
                            </tr>
                          ) : (
                            selectedClassData.students.map((student, index) => (
                              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900">{index + 1}</td>
                                <td className="px-6 py-4 text-gray-900 font-medium">{student.full_name}</td>
                                <td className="px-6 py-4 text-gray-600">{student.admission_number}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className="font-bold text-lg text-gray-900">{student.overall_score || 'N/A'}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPerformanceColor(student.performance_rating || '')}`}>
                                    {student.performance_rating || 'Not Rated'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                    <p className="text-lg">👈 Select a class to view student results</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4">
              <h2 className="text-2xl font-bold">Financial Transactions ({transactions.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-900">Recipient</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-900">Purpose</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-900">Amount</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                        No transactions recorded yet
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{t.type}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{t.recipient_name}</td>
                        <td className="px-6 py-4">{t.purpose}</td>
                        <td className="px-6 py-4 text-center font-bold text-gray-900">₦{t.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {t.status}
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

        {/* Broadcast Tab */}
        {activeTab === 'broadcast' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📢 Send Broadcast Message</h2>
            <div className="max-w-2xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Send To (Staff Role):</label>
                  <select
                    value={broadcastRecipientRole}
                    onChange={(e) => setBroadcastRecipientRole(e.target.value as any)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  >
                    <option value="ALL">🌐 All School Users (Staff & Students)</option>
                    <option value="TEACHER">👨‍🏫 Teachers Only</option>
                    <option value="STUDENT">👨‍🎓 Students Only</option>
                    <option value="PRINCIPAL">🎓 Principal</option>
                    <option value="HEAD_TEACHER">📚 Head Teacher</option>
                    <option value="ACCOUNTANT">💰 Accountant</option>
                    <option value="STAFF">👔 Other Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Message:</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type your broadcast message here..."
                    rows={6}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                  <p className="text-xs text-gray-600 mt-2">Characters: {broadcastMessage.length}</p>
                </div>
                <button
                  onClick={handleSendBroadcast}
                  disabled={sendingBroadcast || !broadcastMessage.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
                >
                  {sendingBroadcast ? '⏳ Sending...' : '📤 Send Broadcast'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete {deleteConfirmation.name}?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmation.type, deleteConfirmation.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modals */}
      <TeacherRegistrationModal
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        schoolId={user?.school_id || ''}
        onSuccess={() => {
          loadInitialData()
        }}
      />

      <StaffRegistrationModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        schoolId={user?.school_id || ''}
        onSuccess={() => {
          loadInitialData()
        }}
      />

      <StudentRegistrationModal
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        schoolId={user?.school_id || ''}
        onSuccess={() => {
          loadInitialData()
        }}
      />

      {/* Edit Modals */}
      {editingStaffId && (
        <EditStaffModal
          staffId={editingStaffId}
          onClose={() => setEditingStaffId(null)}
          onSuccess={() => {
            setEditingStaffId(null)
            loadInitialData()
          }}
        />
      )}

      {editingStudentId && (
        <EditStudentModal
          studentId={editingStudentId}
          onClose={() => setEditingStudentId(null)}
          onSuccess={() => {
            setEditingStudentId(null)
            loadInitialData()
          }}
        />
      )}

      {/* Letter Modals */}
      {letterModal.isOpen && (
        <AdmissionLetterModal
          isOpen={letterModal.isOpen}
          onClose={() => setLetterModal({ ...letterModal, isOpen: false })}
          recipientData={letterModal.recipientData}
          letterType={letterModal.type}
        />
      )}

      <GenerateLetterModal
        isOpen={letterModal.isOpen}
        onClose={() => setLetterModal({ ...letterModal, isOpen: false })}
        recipientData={letterModal.recipientData}
        letterType={letterModal.type}
      />
    </div>
  )
}
