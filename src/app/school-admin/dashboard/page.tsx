'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { SchoolService } from '@/services/school.service'
import { LetterGenerationService } from '@/services/letter-generation.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import StaffHeader from '@/components/StaffHeader'
import StudentProfileEditModal from '@/components/admin/StudentProfileEditModal'
import { toast } from 'react-hot-toast'

interface DashboardState {
  user: User | null
  school: any
  loading: boolean
  error: string
  activeTab: 'overview' | 'staff' | 'students' | 'transactions' | 'academic'
  staffMembers: any[]
  students: any[]
  transactions: any[]
  sessions: any[]
  terms: any[]
  classes: any[]
  broadcastMessage: string
  sendingBroadcast: boolean
  selectedSession: string | null
  selectedTerm: string | null
  selectedClass: string | null
  editingStaff: any | null
  editingStudent: any | null
  editingName: string
  editingEmail: string
  studentProfileEditOpen: boolean
  studentProfileEditId: string | null
}

export default function SchoolAdminDashboard() {
  const router = useRouter()
  
  const [state, setState] = useState<DashboardState>({
    user: null,
    school: null,
    loading: true,
    error: '',
    activeTab: 'overview',
    staffMembers: [],
    students: [],
    transactions: [],
    sessions: [],
    terms: [],
    classes: [],
    broadcastMessage: '',
    sendingBroadcast: false,
    selectedSession: null,
    selectedTerm: null,
    selectedClass: null,
    editingStaff: null,
    editingStudent: null,
    editingName: '',
    editingEmail: '',
    studentProfileEditOpen: false,
    studentProfileEditId: null,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser()
      
      if (!currentUser || (currentUser.role !== 'SCHOOL_ADMIN' && currentUser.role !== 'ADMIN')) {
        router.push('/landing')
        return
      }

      setState(s => ({ ...s, user: currentUser }))

      if (!currentUser.school_id) {
        setState(s => ({ ...s, error: '❌ School ID not found - contact support', loading: false }))
        return
      }

      const schoolData = await SchoolService.getSchoolById(currentUser.school_id)
      setState(s => ({ ...s, school: schoolData }))

      // FIX: Sequential queries instead of Promise.all to avoid timeouts
      try {
        // 1. Load Staff
        const staffResult = await supabase
          .from('users')
          .select('id, full_name, email, role, status, phone, gender, address, state, lga')
          .eq('school_id', currentUser.school_id)
          .in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'])
        const staffData = staffResult.error ? [] : (staffResult.data || [])
        if (staffResult.error) console.error('[Staff Query Error]', staffResult.error.message)

        // 2. Load Students
        let studentsData: any[] = []
        const studentsResult = await supabase
          .from('students')
          .select('id, admission_number, department, date_of_birth, user_id')
          .eq('school_id', currentUser.school_id)
          .limit(500)
        if (studentsResult.error) {
          console.error('[Students Query Error]', studentsResult.error.message)
        } else if (studentsResult.data && studentsResult.data.length > 0) {
          const userIds = studentsResult.data.map(s => s.user_id).filter(Boolean)
          const usersResult = await supabase
            .from('users')
            .select('id, full_name, email, phone, gender, address, state, lga')
            .in('id', userIds)
          const usersMap = Object.fromEntries((usersResult.data || []).map(u => [u.id, u]))
          studentsData = studentsResult.data.map(s => ({
            ...s,
            full_name: usersMap[s.user_id]?.full_name || 'Unknown',
            email: usersMap[s.user_id]?.email || '',
            phone: usersMap[s.user_id]?.phone || '',
            gender: usersMap[s.user_id]?.gender || '',
            address: usersMap[s.user_id]?.address || '',
            state: usersMap[s.user_id]?.state || '',
            lga: usersMap[s.user_id]?.lga || '',
          }))
        }

        // 3. Load Transactions
        const txResult = await supabase
          .from('transactions')
          .select('id, type, recipient_id, recipient_name, amount, purpose, status, created_at')
          .eq('school_id', currentUser.school_id)
          .order('created_at', { ascending: false })
          .limit(100)
        const transactionsData = txResult.error ? [] : (txResult.data || [])
        if (txResult.error) console.error('[Transactions Query Error]', txResult.error.message)

        // 4. Load Sessions
        const sessionsResult = await supabase
          .from('academic_sessions')
          .select('id, session_year, is_active, start_year, end_year')
          .eq('school_id', currentUser.school_id)
          .order('start_year', { ascending: false })
        const sessionsData = sessionsResult.error ? [] : (sessionsResult.data || [])
        if (sessionsResult.error) console.error('[Sessions Query Error]', sessionsResult.error.message)

        // 5. Load Terms
        const termsResult = await supabase
          .from('academic_terms')
          .select('id, session_id, term_name, term_order, is_active, start_date, end_date')
          .eq('school_id', currentUser.school_id)
          .order('term_order', { ascending: true })
        const termsData = termsResult.error ? [] : (termsResult.data || [])
        if (termsResult.error) console.error('[Terms Query Error]', termsResult.error.message)

        // 6. Load Classes
        const classesResult = await supabase
          .from('class_arm_combos')
          .select('id, class_id, arm_id, class_teacher_id')
          .eq('school_id', currentUser.school_id)
        const classesData = classesResult.error ? [] : (classesResult.data || [])
        if (classesResult.error) console.error('[Classes Query Error]', classesResult.error.message)

        setState(s => ({
          ...s,
          staffMembers: staffData,
          students: studentsData,
          transactions: transactionsData,
          sessions: sessionsData,
          terms: termsData,
          classes: classesData,
          loading: false,
          selectedSession: sessionsData && sessionsData.length > 0 ? sessionsData[0].id : null,
        }))
      } catch (queryErr: any) {
        console.error('[Dashboard] Query error:', queryErr)
        setState(s => ({ ...s, error: `❌ ${queryErr.message}`, loading: false }))
      }
    } catch (err: any) {
      console.error('[Dashboard] Error:', err)
      setState(s => ({ ...s, error: `❌ ${err.message}`, loading: false }))
    }
  }

  const editStaff = async (member: any) => {
    setState(s => ({ 
      ...s, 
      editingStaff: member,
      editingName: member.full_name,
      editingEmail: member.email,
    }))
  }

  const saveStaffEdit = async () => {
    try {
      if (!state.editingStaff) return
      setState(s => ({ ...s, error: '⏳ Saving...' }))

      const { error } = await supabase
        .from('users')
        .update({ full_name: state.editingName, email: state.editingEmail })
        .eq('id', state.editingStaff.id)
        .eq('school_id', state.user?.school_id)

      if (error) throw error

      setState(s => ({
        ...s,
        staffMembers: s.staffMembers.map(m => 
          m.id === state.editingStaff.id 
            ? { ...m, full_name: state.editingName, email: state.editingEmail }
            : m
        ),
        editingStaff: null,
        error: '✅ Staff member updated',
      }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 3000)
    } catch (err: any) {
      setState(s => ({ ...s, error: `❌ ${err.message}` }))
    }
  }

  const editStudent = async (student: any) => {
    setState(s => ({ 
      ...s, 
      studentProfileEditOpen: true,
      studentProfileEditId: student.id,
    }))
  }

  const deleteStaff = async (staffId: string) => {
    if (!confirm('Permanently delete this staff member?')) return
    try {
      setState(s => ({ ...s, error: '⏳ Deleting...' }))
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', staffId)
        .eq('school_id', state.user?.school_id)
      if (deleteError) throw deleteError
      setState(s => ({
        ...s,
        staffMembers: s.staffMembers.filter(m => m.id !== staffId),
        error: '✅ Deleted',
      }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 3000)
    } catch (err: any) {
      setState(s => ({ ...s, error: `❌ ${err.message}` }))
    }
  }

  const deleteStudent = async (studentId: string) => {
    if (!confirm('Permanently delete this student?')) return
    try {
      setState(s => ({ ...s, error: '⏳ Deleting...' }))
      await supabase.from('students').delete().eq('id', studentId)
      setState(s => ({
        ...s,
        students: s.students.filter(st => st.id !== studentId),
        error: '✅ Deleted',
      }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 3000)
    } catch (err: any) {
      setState(s => ({ ...s, error: `❌ ${err.message}` }))
    }
  }

  const handleSendBroadcast = async () => {
    if (!state.user?.school_id || !state.broadcastMessage.trim()) {
      setState(s => ({ ...s, error: 'Missing info' }))
      return
    }
    setState(s => ({ ...s, sendingBroadcast: true, error: '' }))
    try {
      const response = await fetch('/api/broadcasts/send-to-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: state.user.school_id,
          message: state.broadcastMessage,
          recipient_role: null,
          sender_id: state.user.id,
          sender_name: state.user.full_name || 'Admin',
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed')
      setState(s => ({
        ...s,
        broadcastMessage: '',
        error: `✅ Sent to ${result.recipients_count} recipients!`,
        sendingBroadcast: false,
      }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 4000)
    } catch (err: any) {
      setState(s => ({ ...s, error: `❌ ${err.message}`, sendingBroadcast: false }))
    }
  }

  if (state.loading) {
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
      {/* Main Header */}
      <div className="sticky top-0 z-50">
        <StaffHeader
          staffName={state.user?.full_name || 'School Administrator'}
          schoolName={state.school?.name || 'School'}
          section="Administration Center"
        />
      </div>

      {/* Navigation Tabs - Sticky below header */}
      <div className="sticky top-16 z-40 bg-white shadow-md border-b border-gray-200 overflow-x-auto">
        <div className="min-w-max md:max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'staff', label: '👨‍🏫 Staff' },
              { id: 'students', label: '👨‍🎓 Students' },
              { id: 'transactions', label: '💰 Transactions' },
              { id: 'academic', label: '📚 Academic' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setState(s => ({ ...s, activeTab: tab.id as any }))}
                className={`px-2 sm:px-4 py-3 font-semibold text-xs sm:text-sm whitespace-nowrap border-b-4 transition-all ${
                  state.activeTab === tab.id
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
        {state.error && (
          <div className={`mb-6 p-4 rounded-lg border ${state.error.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {state.error}
          </div>
        )}

        {/* EDIT STAFF MODAL */}
        {state.editingStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4">Edit Staff</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={state.editingName}
                    onChange={(e) => setState(s => ({ ...s, editingName: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={state.editingEmail}
                    onChange={(e) => setState(s => ({ ...s, editingEmail: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setState(s => ({ ...s, editingStaff: null }))}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStaffEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Profile Edit Modal */}
        {state.user?.school_id && state.studentProfileEditId && (
          <StudentProfileEditModal
            studentId={state.studentProfileEditId}
            schoolId={state.user.school_id}
            isOpen={state.studentProfileEditOpen}
            onClose={() => setState(s => ({ ...s, studentProfileEditOpen: false, studentProfileEditId: null }))}
            onSuccess={() => {
              setState(s => ({ ...s, studentProfileEditOpen: false, studentProfileEditId: null }))
              loadDashboardData()
            }}
          />
        )}

        {/* Overview Tab */}
        {state.activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
              <p className="text-gray-600 text-sm font-semibold">👨‍🏫 Staff</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{state.staffMembers.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
              <p className="text-gray-600 text-sm font-semibold">👨‍🎓 Students</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{state.students.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-600">
              <p className="text-gray-600 text-sm font-semibold">💳 Transactions</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{state.transactions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-600">
              <p className="text-gray-600 text-sm font-semibold">📚 Sessions</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{state.sessions.length}</p>
            </div>
          </div>
        )}

        {/* Staff Tab */}
        {state.activeTab === 'staff' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">👨‍🏫 Staff ({state.staffMembers.length})</h2>
            {state.staffMembers.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p>No staff registered</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.staffMembers.map((member: any) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{member.full_name}</td>
                        <td className="px-6 py-4 text-sm">{member.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            member.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center space-x-2">
                          <button
                            onClick={() => editStaff(member)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 font-semibold"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => generateStaffLetter(member)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 font-semibold"
                            title="Generate appointment letter"
                          >
                            📄 Letter
                          </button>
                          <button
                            onClick={() => deleteStaff(member.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 font-semibold"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {state.activeTab === 'students' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">👨‍🎓 Students ({state.students.length})</h2>
            {state.students.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p>No students registered</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Admission #</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Department</th>
                      <th className="px-6 py-3 text-center text-sm font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.students.map((student: any) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{student.full_name}</td>
                        <td className="px-6 py-4 text-sm">{student.admission_number}</td>
                        <td className="px-6 py-4 text-sm">{student.email}</td>
                        <td className="px-6 py-4 text-sm">{student.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-center space-x-2">
                          <button
                            onClick={() => editStudent(student)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 font-semibold"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => generateStudentLetter(student)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 font-semibold"
                            title="Generate admission letter"
                          >
                            📄 Letter
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 font-semibold"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {state.activeTab === 'transactions' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">💳 Transactions ({state.transactions.length})</h2>
            {state.transactions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p>No transactions recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold">Recipient</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.transactions.map((txn: any) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{txn.recipient_name}</td>
                        <td className="px-6 py-4 text-sm">{txn.type}</td>
                        <td className="px-6 py-4 text-sm font-semibold">₦{txn.amount}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            txn.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{new Date(txn.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Academic Tab */}
        {state.activeTab === 'academic' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📚 Academic Structure</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Sessions ({state.sessions.length})</h3>
                <div className="space-y-2">
                  {state.sessions.length === 0 ? (
                    <p className="text-gray-500">No sessions</p>
                  ) : (
                    state.sessions.map((session: any) => (
                      <div key={session.id} className="p-2 bg-blue-50 rounded">
                        <p className="font-semibold">{session.session_year}</p>
                        <p className="text-xs text-gray-600">{session.start_year}-{session.end_year}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Terms ({state.terms.length})</h3>
                <div className="space-y-2">
                  {state.terms.length === 0 ? (
                    <p className="text-gray-500">No terms</p>
                  ) : (
                    state.terms.map((term: any) => (
                      <div key={term.id} className="p-2 bg-green-50 rounded">
                        <p className="font-semibold">{term.term_name}</p>
                        <p className="text-xs text-gray-600">Term {term.term_order}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Classes ({state.classes.length})</h3>
                <div className="space-y-2">
                  {state.classes.length === 0 ? (
                    <p className="text-gray-500">No classes</p>
                  ) : (
                    state.classes.slice(0, 5).map((cls: any) => (
                      <div key={cls.id} className="p-2 bg-purple-50 rounded">
                        <p className="font-semibold text-xs">Class-Arm Combo</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
