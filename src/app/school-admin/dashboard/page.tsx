'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { SchoolService } from '@/services/school.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import StaffHeader from '@/components/StaffHeader'

interface DashboardState {
  user: User | null
  school: any
  loading: boolean
  error: string
  activeTab: 'overview' | 'staff' | 'students' | 'results' | 'transactions' | 'broadcast' | 'fees' | 'academic'
  staffMembers: any[]
  students: any[]
  results: any[]
  transactions: any[]
  sessions: any[]
  terms: any[]
  classes: any[]
  broadcastMessage: string
  sendingBroadcast: boolean
  selectedSession: string | null
  selectedTerm: string | null
  selectedClass: string | null
  selectedClassData: any | null
  loadingResults: boolean
  resultsClasses: any[]
  editingStaff: any | null
  editingStudent: any | null
  editingName: string
  editingEmail: string
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
    results: [],
    transactions: [],
    sessions: [],
    terms: [],
    classes: [],
    broadcastMessage: '',
    sendingBroadcast: false,
    selectedSession: null,
    selectedTerm: null,
    selectedClass: null,
    selectedClassData: null,
    loadingResults: false,
    resultsClasses: [],
    editingStaff: null,
    editingStudent: null,
    editingName: '',
    editingEmail: '',
  })

  // FIXED: Add real-time subscription for transactions
  useEffect(() => {
    if (!state.user?.school_id) return

    const subscription = supabase
      .channel(`transactions:${state.user.school_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `school_id=eq.${state.user.school_id}`,
        },
        (payload) => {
          console.log('[Realtime] Transaction update:', payload)
          // Reload transactions
          loadDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [state.user?.school_id])

  // When session changes, load its terms - FIXED: Better error handling
  useEffect(() => {
    if (state.selectedSession && state.terms.length > 0) {
      const sessionTerms = state.terms.filter((t) => t.session_id === state.selectedSession)
      console.log('[Results] Terms for session:', { session: state.selectedSession, found: sessionTerms.length })
      if (sessionTerms.length > 0) {
        setState(s => ({ 
          ...s, 
          selectedTerm: sessionTerms[0].id,
          selectedClass: null,
          selectedClassData: null,
        }))
      } else {
        setState(s => ({ 
          ...s, 
          selectedTerm: null,
          error: '⚠️ No terms found for this session',
          selectedClass: null,
          selectedClassData: null,
        }))
      }
    }
  }, [state.selectedSession, state.terms])

  // When term changes, load classes
  useEffect(() => {
    if (state.selectedTerm && state.user?.school_id) {
      loadResultsClasses(state.user.school_id, state.selectedTerm)
    }
  }, [state.selectedTerm, state.user?.school_id])

  // Auto-select first class when classes load
  useEffect(() => {
    if (state.resultsClasses.length > 0 && !state.selectedClass) {
      setState(s => ({
        ...s,
        selectedClass: state.resultsClasses[0].id,
        selectedClassData: state.resultsClasses[0],
      }))
    }
  }, [state.resultsClasses])

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

      // Fetch all data from backend
      const apiResponse = await fetch('/api/admin/dashboard-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: currentUser.school_id }),
      })

      if (!apiResponse.ok) {
        const error = await apiResponse.json()
        throw new Error(error.details || error.error || 'Failed to fetch data')
      }

      const { staff, students, results, transactions } = await apiResponse.json()

      // Load academic data - FIXED: Ensure we get session_id for terms
      const { data: sessionsData } = await supabase
        .from('academic_sessions')
        .select('id, session_year, is_active')
        .eq('school_id', currentUser.school_id)
        .order('session_year', { ascending: false })

      const { data: termsData } = await supabase
        .from('terms')
        .select('id, session_id, term_name, term_number, is_active')
        .eq('school_id', currentUser.school_id)
        .order('term_number', { ascending: true })

      const { data: classesData } = await supabase
        .from('class_arm_combos')
        .select('id, class_name, arm_name, class_id, arm_id')
        .eq('school_id', currentUser.school_id)
        .order('class_name', { ascending: true })

      setState(s => ({
        ...s,
        staffMembers: staff || [],
        students: students || [],
        results: results || [],
        transactions: transactions || [],
        sessions: sessionsData || [],
        terms: termsData || [],
        classes: classesData || [],
        loading: false,
        selectedSession: sessionsData && sessionsData.length > 0 ? sessionsData[0].id : null,
      }))
    } catch (err: any) {
      console.error('[Dashboard] Error:', err)
      setState(s => ({ ...s, error: `❌ ${err.message}`, loading: false }))
    }
  }

  const loadResultsClasses = async (schoolId: string, termId: string) => {
    try {
      setState(s => ({ ...s, loadingResults: true }))

      // FIXED: Change from POST with body to GET with query params
      const response = await fetch(`/api/results/school-classes-and-students?schoolId=${schoolId}&termId=${termId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load classes')
      }

      const { classes } = await response.json()
      setState(s => ({
        ...s,
        resultsClasses: classes || [],
        loadingResults: false,
        selectedClass: classes && classes.length > 0 ? classes[0].id : null,
        selectedClassData: classes && classes.length > 0 ? classes[0] : null,
      }))
    } catch (err: any) {
      console.error('[Results] Error:', err)
      setState(s => ({ ...s, loadingResults: false, error: `❌ Failed to load classes: ${err.message}` }))
    }
  }

  const generateLetterForStaff = async (member: any) => {
    try {
      if (!state.user?.school_id) return
      
      // FIXED: Send full staff details instead of just IDs
      const response = await fetch('/api/school-admin/staff/appointment-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: member.id,
          staffName: member.full_name,
          position: member.role || 'Staff',
          schoolName: state.school?.name || 'School',
          appointmentDate: new Date().toLocaleDateString(),
          salary: 'As per agreement',
          duties: 'As per job description',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate letter')
      }

      const { letter } = await response.json()
      const blob = new Blob([letter], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${member.full_name}_appointment_letter.html`
      a.click()
      URL.revokeObjectURL(url)
      setState(s => ({ ...s, error: '✅ Letter generated successfully!' }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 3000)
    } catch (err: any) {
      console.error('[Letter] Error:', err)
      setState(s => ({ ...s, error: `❌ ${err.message}` }))
    }
  }

  const generateLetterForStudent = async (student: any) => {
    try {
      if (!state.user?.school_id) return
      
      // FIXED: Send full student details instead of just IDs
      const response = await fetch('/api/school-admin/students/admission-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.full_name,
          admissionNumber: student.admission_number || 'ADM-000',
          className: student.department || 'Class',
          schoolName: state.school?.name || 'School',
          admissionDate: new Date().toLocaleDateString(),
          parentName: 'Parent/Guardian',
          tuitionFee: 'As per fee schedule',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate letter')
      }

      const { letter } = await response.json()
      const blob = new Blob([letter], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${student.full_name}_admission_letter.html`
      a.click()
      URL.revokeObjectURL(url)
      setState(s => ({ ...s, error: '✅ Letter generated successfully!' }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 3000)
    } catch (err: any) {
      console.error('[Letter] Error:', err)
      setState(s => ({ ...s, error: `❌ ${err.message}` }))
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

      // Update local state
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
      editingStudent: student,
      editingName: student.full_name,
      editingEmail: student.email,
    }))
  }

  const saveStudentEdit = async () => {
    try {
      if (!state.editingStudent) return
      setState(s => ({ ...s, error: '⏳ Saving...' }))

      const { error } = await supabase
        .from('users')
        .update({ full_name: state.editingName, email: state.editingEmail })
        .eq('id', state.editingStudent.id)
        .eq('school_id', state.user?.school_id)

      if (error) throw error

      // Update local state
      setState(s => ({
        ...s,
        students: s.students.map(st => 
          st.id === state.editingStudent.id 
            ? { ...st, full_name: state.editingName, email: state.editingEmail }
            : st
        ),
        editingStudent: null,
        error: '✅ Student updated',
      }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 3000)
    } catch (err: any) {
      setState(s => ({ ...s, error: `❌ ${err.message}` }))
    }
  }

  const deleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to permanently delete this staff member? This action cannot be undone.')) return

    try {
      setState(s => ({ ...s, error: '⏳ Deleting...' }))
      
      // FIXED: Cascade delete from related tables
      // 1. Delete from broadcasts
      await supabase.from('broadcasts').delete().eq('sender_id', staffId)
      
      // 2. Delete from lesson_notes
      await supabase.from('lesson_notes').delete().eq('created_by', staffId)
      
      // 3. Delete from assignments  
      await supabase.from('assignments').delete().eq('created_by', staffId)
      
      // 4. Delete from users (main record)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', staffId)
        .eq('school_id', state.user?.school_id)

      if (deleteError) throw deleteError

      // Update local state
      setState(s => ({
        ...s,
        staffMembers: s.staffMembers.filter(m => m.id !== staffId),
        error: '✅ Staff member permanently deleted',
      }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 3000)
    } catch (err: any) {
      console.error('[Delete Staff] Error:', err)
      setState(s => ({ ...s, error: `❌ Delete failed: ${err.message}` }))
    }
  }

  const deleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this student? This action cannot be undone.')) return

    try {
      setState(s => ({ ...s, error: '⏳ Deleting...' }))
      
      // FIXED: Cascade delete from related tables
      // 1. Delete from results/scores
      await supabase.from('score_sheets').delete().eq('student_id', studentId)
      await supabase.from('results').delete().eq('student_id', studentId)
      
      // 2. Delete from transactions
      await supabase.from('transactions').delete().eq('student_id', studentId)
      
      // 3. Delete from broadcasts
      await supabase.from('broadcasts').delete().eq('sender_id', studentId)
      
      // 4. Delete from students table
      await supabase.from('students').delete().eq('id', studentId)
      
      // 5. Delete from users (main record)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId)
        .eq('school_id', state.user?.school_id)

      if (deleteError) throw deleteError

      // Update local state
      setState(s => ({
        ...s,
        students: s.students.filter(st => st.id !== studentId),
        error: '✅ Student permanently deleted',
      }))
      setTimeout(() => setState(s => ({ ...s, error: '' })), 3000)
    } catch (err: any) {
      console.error('[Delete Student] Error:', err)
      setState(s => ({ ...s, error: `❌ Delete failed: ${err.message}` }))
    }
  }

  const handleSendBroadcast = async () => {
    if (!state.user?.school_id || !state.broadcastMessage.trim()) {
      setState(s => ({ ...s, error: 'Missing information' }))
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
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send broadcast')
      }

      setState(s => ({
        ...s,
        broadcastMessage: '',
        error: `✅ Broadcast sent to ${result.recipients_count} recipient(s)!`,
        sendingBroadcast: false,
      }))

      setTimeout(() => setState(s => ({ ...s, error: '' })), 4000)
    } catch (err: any) {
      console.error('[Broadcast] Error:', err)
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
      <StaffHeader
        staffName={state.user?.full_name || 'School Administrator'}
        schoolName={state.school?.name || 'School'}
        section="Administration Center"
      />

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-30 bg-white shadow-md border-b border-gray-200 overflow-x-auto">
        <div className="min-w-max md:max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'staff', label: '👨‍🏫 Staff' },
              { id: 'students', label: '👨‍🎓 Students' },
              { id: 'results', label: '📈 Results' },
              { id: 'transactions', label: '💰 Fees' },
              { id: 'academic', label: '📚 Academic' },
              { id: 'broadcast', label: '📢 Broadcast' },
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
              <h3 className="text-2xl font-bold mb-4">Edit Staff Member</h3>
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

        {/* EDIT STUDENT MODAL */}
        {state.editingStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4">Edit Student</h3>
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
                  onClick={() => setState(s => ({ ...s, editingStudent: null }))}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStudentEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {state.activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
              <p className="text-gray-600 text-sm font-semibold">👨‍🏫 Total Staff</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{state.staffMembers.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
              <p className="text-gray-600 text-sm font-semibold">👨‍🎓 Total Students</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{state.students.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-600">
              <p className="text-gray-600 text-sm font-semibold">📈 Results</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{state.results.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-600">
              <p className="text-gray-600 text-sm font-semibold">💰 Transactions</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{state.transactions.length}</p>
            </div>
          </div>
        )}

        {/* Staff Tab */}
        {state.activeTab === 'staff' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">👨‍🏫 Staff Members ({state.staffMembers.length})</h2>
            {state.staffMembers.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p className="text-lg">No staff registered yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.staffMembers.map((member: any) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{member.full_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            member.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center space-x-2">
                          <button
                            onClick={() => generateLetterForStaff(member)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 font-semibold inline-block"
                          >
                            📄 Letter
                          </button>
                          <button
                            onClick={() => editStaff(member)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 font-semibold inline-block"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteStaff(member.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 font-semibold inline-block"
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
                <p className="text-lg">No students registered yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Admission #</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Department</th>
                      <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.students.map((student: any) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{student.full_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{student.admission_number || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{student.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-center space-x-2">
                          <button
                            onClick={() => generateLetterForStudent(student)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 font-semibold inline-block"
                          >
                            📄 Letter
                          </button>
                          <button
                            onClick={() => editStudent(student)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 font-semibold inline-block"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 font-semibold inline-block"
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

        {/* Results Tab - Matches Principal Design */}
        {state.activeTab === 'results' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📈 Academic Results</h2>
            
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Academic Session</label>
                  <select
                    value={state.selectedSession || ''}
                    onChange={(e) => setState(s => ({ ...s, selectedSession: e.target.value, selectedTerm: null }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Select Session</option>
                    {state.sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.session_year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Term</label>
                  <select
                    value={state.selectedTerm || ''}
                    onChange={(e) => setState(s => ({ ...s, selectedTerm: e.target.value }))}
                    disabled={!state.selectedSession}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Select Term</option>
                    {state.selectedSession && state.terms
                      .filter((t) => t.session_id === state.selectedSession)
                      .map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.term_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Class</label>
                  <select
                    value={state.selectedClass || ''}
                    onChange={(e) => {
                      const selected = state.resultsClasses.find(c => c.id === e.target.value)
                      setState(s => ({ ...s, selectedClass: e.target.value, selectedClassData: selected }))
                    }}
                    disabled={!state.selectedTerm}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Select Class</option>
                    {state.resultsClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name} {cls.arm_name ? `(${cls.arm_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Results Table */}
            {state.selectedClassData ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                  <h3 className="text-xl font-bold">
                    {state.selectedClassData.class_name} {state.selectedClassData.arm_name ? `(${state.selectedClassData.arm_name})` : ''}
                  </h3>
                  <p className="text-sm text-blue-100">Total Students: {state.selectedClassData.students?.length || 0}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">#</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Student Name</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Admission #</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Overall Score</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {state.selectedClassData.students && state.selectedClassData.students.map((student: any, idx: number) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{student.full_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{student.admission_number}</td>
                          <td className="px-6 py-4 text-sm text-center font-bold text-blue-600">{student.overall_score || 0}</td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              student.performance_rating === 'Excellent' ? 'bg-green-100 text-green-700' :
                              student.performance_rating === 'Good' ? 'bg-blue-100 text-blue-700' :
                              student.performance_rating === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {student.performance_rating || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p className="text-lg">Please select a session, term, and class to view results</p>
              </div>
            )}
          </div>
        )}

        {/* Fees Tab */}
        {state.activeTab === 'transactions' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">💰 School Fees & Transactions</h2>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                <p className="text-gray-600 text-sm font-semibold">Total Transactions</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{state.transactions.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
                <p className="text-gray-600 text-sm font-semibold">Paid</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {state.transactions.filter((t: any) => t.status === 'PAID').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-600">
                <p className="text-gray-600 text-sm font-semibold">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {state.transactions.filter((t: any) => t.status === 'PENDING').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-600">
                <p className="text-gray-600 text-sm font-semibold">Partial</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {state.transactions.filter((t: any) => t.status === 'PARTIAL').length}
                </p>
              </div>
            </div>

            {/* Transactions Table */}
            {state.transactions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p className="text-lg">No transactions recorded</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">#</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Student Name</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Admission #</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Amount</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {state.transactions.map((trans: any, idx: number) => (
                        <tr key={trans.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{trans.student_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{trans.admission_number || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-center font-bold">₦{trans.amount?.toLocaleString() || 0}</td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              trans.status === 'PAID' ? 'bg-green-100 text-green-700' :
                              trans.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {trans.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{trans.payment_method || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Academic Tab */}
        {state.activeTab === 'academic' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📚 Academic Management</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-600">
                <p className="text-gray-600 font-semibold mb-2">🏫 Active Sessions</p>
                <p className="text-4xl font-bold text-purple-600">{state.sessions.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-600">
                <p className="text-gray-600 font-semibold mb-2">📅 Total Terms</p>
                <p className="text-4xl font-bold text-indigo-600">{state.terms.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                <p className="text-gray-600 font-semibold mb-2">👥 Total Classes</p>
                <p className="text-4xl font-bold text-blue-600">{state.classes.length}</p>
              </div>
            </div>

            {/* Sessions Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">📋 Academic Sessions</h3>
              {state.sessions.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No sessions found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Session Year</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {state.sessions.map((session: any) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{session.session_year}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              session.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {session.is_active ? '✓ Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Terms Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">📅 Terms</h3>
              {state.terms.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No terms found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {state.terms.map((term: any) => {
                    const session = state.sessions.find(s => s.id === term.session_id)
                    return (
                      <div key={term.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-600 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-lg font-bold text-gray-900">{term.term_name}</p>
                            <p className="text-sm text-gray-600">Term {term.term_number}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            term.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {term.is_active ? '✓' : '○'}
                          </span>
                        </div>
                        {session && (
                          <p className="text-xs text-gray-500 mt-3 pt-3 border-t">
                            Session: {session.session_year}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Classes Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">👥 Classes</h3>
              {state.classes.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No classes found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Class Name</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Arm/Section</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {state.classes.map((cls: any) => (
                        <tr key={cls.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{cls.class_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{cls.arm_name || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Broadcast Tab */}
        {state.activeTab === 'broadcast' && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">📢 Send Broadcast Message</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Message:</label>
                <textarea
                  value={state.broadcastMessage}
                  onChange={(e) => setState(s => ({ ...s, broadcastMessage: e.target.value }))}
                  placeholder="Type your message to send to all school members..."
                  rows={6}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSendBroadcast}
                disabled={state.sendingBroadcast || !state.broadcastMessage.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {state.sendingBroadcast ? '⏳ Sending...' : '📤 Send Broadcast'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
