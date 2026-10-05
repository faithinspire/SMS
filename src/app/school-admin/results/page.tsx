'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { AuthService } from '@/services/auth.service'
import { toast } from 'react-hot-toast'

const supabase = createClient()

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

interface ClassArm {
  id: string
  class: { name: string }
  arm: { name: string }
}

interface StudentScore {
  id: string
  full_name: string
  admission_number: string
  scores: number
  grade: string
}

export default function ResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schoolId, setSchoolId] = useState('')

  // Dropdown states
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState('')

  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [loadingTerms, setLoadingTerms] = useState(false)

  const [classes, setClasses] = useState<ClassArm[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [loadingClasses, setLoadingClasses] = useState(false)

  const [students, setStudents] = useState<StudentScore[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Initialize on mount
  useEffect(() => {
    initializeUser()
  }, [])

  const initializeUser = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'SCHOOL_ADMIN') {
        router.push('/landing')
        return
      }

      if (!currentUser.school_id) {
        setError('Your account is not linked to a school. Contact your administrator.')
        setLoading(false)
        return
      }

      setSchoolId(currentUser.school_id)

      // Load sessions immediately
      await loadSessions(currentUser.school_id)
      setLoading(false)
    } catch (err) {
      console.error('[Results] Init error:', err)
      setError('Failed to initialize')
      setLoading(false)
    }
  }

  const loadSessions = async (schoolId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('academic_sessions')
        .select('id, session_year, is_active')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (err) throw err

      setSessions(data || [])
      if (data && data.length > 0) {
        setSelectedSession(data[0].id)
      }
    } catch (err) {
      console.error('[Results] Sessions error:', err)
      toast.error('Failed to load sessions')
    }
  }

  const loadTerms = async () => {
    if (!selectedSession || !schoolId) return

    try {
      setLoadingTerms(true)
      setSelectedTerm('')
      setClasses([])
      setStudents([])

      const { data, error: err } = await supabase
        .from('academic_terms')
        .select('id, session_id, term_name, term_number, is_active')
        .eq('session_id', selectedSession)
        .eq('school_id', schoolId)
        .order('term_number', { ascending: true })

      if (err) throw err

      setTerms(data || [])
      if (data && data.length > 0) {
        setSelectedTerm(data[0].id)
      }
    } catch (err) {
      console.error('[Results] Terms error:', err)
      toast.error('Failed to load terms')
    } finally {
      setLoadingTerms(false)
    }
  }

  const loadClasses = async () => {
    if (!selectedTerm || !schoolId) return

    try {
      setLoadingClasses(true)
      setSelectedClass('')
      setStudents([])

      const { data, error: err } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          class:class_id (name),
          arm:arm_id (name)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: true })

      if (err) throw err

      setClasses(data || [])
      if (data && data.length > 0) {
        setSelectedClass(data[0].id)
      }
    } catch (err) {
      console.error('[Results] Classes error:', err)
      toast.error('Failed to load classes')
    } finally {
      setLoadingClasses(false)
    }
  }

  const loadStudentResults = async () => {
    if (!selectedClass || !selectedTerm || !schoolId) return

    try {
      setLoadingStudents(true)

      // Get students in this class
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('id, user_id, class_arm_combo_id, admission_number')
        .eq('class_arm_combo_id', selectedClass)
        .eq('school_id', schoolId)

      if (studentErr) throw studentErr

      // Get scores for these students
      const studentIds = studentData?.map(s => s.id) || []
      if (studentIds.length === 0) {
        setStudents([])
        setLoadingStudents(false)
        return
      }

      const { data: scores, error: scoresErr } = await supabase
        .from('score_sheets')
        .select('student_id, total_score, grade, performance_rating')
        .in('student_id', studentIds)
        .eq('term_id', selectedTerm)

      if (scoresErr) throw scoresErr

      // Combine student data with scores
      const studentResults = await Promise.all(
        studentData?.map(async (student) => {
          const { data: user } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', student.user_id)
            .maybeSingle()

          const score = scores?.find(s => s.student_id === student.id)

          return {
            id: student.id,
            full_name: user?.full_name || 'Unknown',
            admission_number: student.admission_number,
            scores: score?.total_score || 0,
            grade: score?.grade || 'N/A',
          }
        }) || []
      )

      setStudents(studentResults)
    } catch (err) {
      console.error('[Results] Student results error:', err)
      toast.error('Failed to load student results')
    } finally {
      setLoadingStudents(false)
    }
  }

  // Trigger student load when class changes
  useEffect(() => {
    if (selectedClass) {
      loadStudentResults()
    }
  }, [selectedClass])

  // Update terms when session changes
  useEffect(() => {
    if (selectedSession) {
      loadTerms()
    }
  }, [selectedSession])

  // Update classes when term changes
  useEffect(() => {
    if (selectedTerm) {
      loadClasses()
    }
  }, [selectedTerm])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-700 font-semibold">❌ {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold mb-6">📊 Student Results Management</h1>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        {/* Sessions Dropdown */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Session</label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Session</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.session_year} {session.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Terms Dropdown */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            disabled={loadingTerms || terms.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">
              {loadingTerms ? 'Loading terms...' : 'Select Term'}
            </option>
            {terms.map(term => (
              <option key={term.id} value={term.id}>
                {term.term_name} {term.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Classes Dropdown */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loadingClasses || classes.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">
              {loadingClasses ? 'Loading classes...' : 'Select Class'}
            </option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.class?.name} {cls.arm?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Badge */}
        <div className="flex items-end">
          {loadingStudents ? (
            <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
              ⏳ Loading results...
            </span>
          ) : students.length > 0 ? (
            <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-semibold">
              ✅ {students.length} students
            </span>
          ) : (
            <span className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm">
              No results
            </span>
          )}
        </div>
      </div>

      {/* Results Table */}
      {students.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="p-3 text-left font-bold">Admission No.</th>
                <th className="p-3 text-left font-bold">Student Name</th>
                <th className="p-3 text-center font-bold">Score</th>
                <th className="p-3 text-center font-bold">Grade</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr
                  key={student.id}
                  className={`border-b ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50`}
                >
                  <td className="p-3 font-semibold">{student.admission_number}</td>
                  <td className="p-3">{student.full_name}</td>
                  <td className="p-3 text-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">
                      {student.scores}%
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold">{student.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No results to display</p>
          <p className="text-sm mt-2">Select a session, term, and class to view student results</p>
        </div>
      )}
    </div>
  )
}

  const loadInitialData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser()
      
      if (!currentUser || (currentUser.role !== 'SCHOOL_ADMIN' && currentUser.role !== 'ADMIN')) {
        router.push('/landing')
        return
      }

      if (!currentUser.school_id) {
        setState(s => ({ ...s, error: '❌ Your account is not linked to a school. Contact your administrator.', loading: false }))
        return
      }

      // Load school data
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .maybeSingle()

      setState(s => ({ ...s, user: currentUser, school: schoolData, loading: false }))
    } catch (err: any) {
      console.error('[Results] Error loading user:', err)
      setState(s => ({ ...s, error: `❌ ${err.message}`, loading: false }))
    }
  }

  const loadSessions = async () => {
    try {
      if (!state.user?.school_id) return

      console.log('[Results] Loading sessions for school:', state.user.school_id)

      const { data, error } = await supabase
        .from('academic_sessions')
        .select('id, session_year, start_year, end_year, is_active')
        .eq('school_id', state.user.school_id)
        .order('start_year', { ascending: false })

      if (error) throw error

      console.log('[Results] Sessions loaded:', data)
      console.log('[Results] Session count:', data?.length || 0)

      if (!data || data.length === 0) {
        console.warn('[Results] ⚠️ No sessions found for this school')
        setState(s => ({
          ...s,
          sessions: [],
          selectedSession: null,
          error: '📭 No academic sessions found. Create sessions first.',
        }))
        return
      }

      // Ensure all sessions have valid session_year
      const validSessions = data.filter(s => s.session_year && typeof s.session_year === 'string')
      console.log('[Results] Valid sessions after filtering:', validSessions)

      setState(s => ({
        ...s,
        sessions: validSessions,
        selectedSession: validSessions.length > 0 ? validSessions[0].id : null,
        error: '',
      }))
    } catch (err: any) {
      console.error('[Results] Error loading sessions:', err)
      setState(s => ({ ...s, error: `❌ Failed to load sessions: ${err.message}`, sessions: [] }))
    }
  }

  const loadTerms = async () => {
    try {
      if (!state.selectedSession) return

      setState(s => ({ ...s, loadingTerms: true, error: '' }))

      console.log('[Results] Loading terms for session:', state.selectedSession)

      const { data, error } = await supabase
        .from('academic_terms')
        .select('id, session_id, term_number, name, is_active')
        .eq('session_id', state.selectedSession)
        .eq('school_id', state.user.school_id)
        .order('term_number', { ascending: true })

      if (error) throw error

      console.log('[Results] Terms loaded:', data?.length || 0)

      setState(s => ({
        ...s,
        terms: data || [],
        selectedTerm: data && data.length > 0 ? data[0].id : null,
        loadingTerms: false,
      }))
    } catch (err: any) {
      console.error('[Results] Error loading terms:', err)
      setState(s => ({ 
        ...s, 
        error: `❌ Failed to load terms: ${err.message}`,
        loadingTerms: false,
      }))
    }
  }

  const loadClasses = async () => {
    try {
      if (!state.selectedTerm || !state.user?.school_id) return

      setState(s => ({ ...s, loadingClasses: true, error: '' }))

      console.log('[Results] Loading classes for term:', state.selectedTerm)

      const response = await fetch(
        `/api/results/school-classes-and-students?schoolId=${state.user.school_id}&termId=${state.selectedTerm}`
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      console.log('[Results] Classes loaded:', result.classes?.length || 0)

      setState(s => ({
        ...s,
        classes: result.classes || [],
        loadingClasses: false,
      }))
    } catch (err: any) {
      console.error('[Results] Error loading classes:', err)
      setState(s => ({ 
        ...s, 
        error: `❌ Failed to load classes: ${err.message}`,
        loadingClasses: false,
      }))
    }
  }

  const getSelectedSessionYear = () => {
    const session = state.sessions.find(s => s.id === state.selectedSession)
    if (!session) return 'Select a session'
    
    // Display: "2026/2027" or "2026/2027 ✓ Current" if active
    const display = session.session_year || 'Unknown'
    const indicator = session.is_active ? ' ✓ Current' : ''
    return `${display}${indicator}`
  }

  const getSelectedTermName = () => {
    const term = state.terms.find(t => t.id === state.selectedTerm)
    return term ? (term.name || `Term ${term.term_number}`) : 'Select a term'
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading results page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50">
        <StaffHeader
          staffName={state.user?.full_name || 'School Administrator'}
          schoolName={state.school?.name || 'School'}
          section="Results Management"
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {state.error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {state.error}
          </div>
        )}

        {/* Selectors Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Session Selector */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              📅 Academic Session
            </label>
            <select
              value={state.selectedSession || ''}
              onChange={(e) => {
                setState(s => ({ 
                  ...s, 
                  selectedSession: e.target.value || null,
                  selectedTerm: null,
                  terms: [],
                  classes: [],
                }))
              }}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
            >
              <option value="">Select a session</option>
              {state.sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.session_year}
                  {session.is_active ? ' ✓ Current' : ''}
                </option>
              ))}
            </select>
            {state.sessions.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">📭 No sessions available</p>
            )}
          </div>

          {/* Term Selector */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              📋 Term
            </label>
            <select
              value={state.selectedTerm || ''}
              onChange={(e) => {
                setState(s => ({ 
                  ...s, 
                  selectedTerm: e.target.value || null,
                  classes: [],
                }))
              }}
              disabled={!state.selectedSession || state.loadingTerms}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {state.loadingTerms ? '⏳ Loading terms...' : 'Select a term'}
              </option>
              {state.terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name || `Term ${term.term_number}`}
                  {term.is_active ? ' (Active)' : ''}
                </option>
              ))}
            </select>
            {!state.selectedSession && (
              <p className="text-sm text-gray-500 mt-2">👆 Select a session first</p>
            )}
            {state.selectedSession && state.terms.length === 0 && !state.loadingTerms && (
              <p className="text-sm text-gray-500 mt-2">📭 No terms available</p>
            )}
          </div>
        </div>

        {/* Results Section */}
        {state.selectedTerm && (
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                📊 Results - {getSelectedSessionYear()} • {getSelectedTermName()}
              </h2>
              <p className="text-gray-600 mt-2">
                {state.loadingClasses ? '⏳ Loading classes and students...' : `${state.classes.length} classes`}
              </p>
            </div>

            {state.loadingClasses ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading classes and student results...</p>
              </div>
            ) : state.classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-600">📭 No classes found for this term</p>
              </div>
            ) : (
              <div className="space-y-6">
                {state.classes.map(cls => (
                  <div key={cls.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Class Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                      <h3 className="text-xl font-bold">
                        {cls.class_name} {cls.arm_name}
                      </h3>
                      <p className="text-blue-100 text-sm mt-1">
                        👥 {cls.student_count} student{cls.student_count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Students Table */}
                    {cls.students.length === 0 ? (
                      <div className="p-6 text-center text-gray-600">
                        No students enrolled in this class
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100 border-b-2 border-gray-300">
                            <tr>
                              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">
                                Admission #
                              </th>
                              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">
                                Student Name
                              </th>
                              <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">
                                Score
                              </th>
                              <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">
                                Grade
                              </th>
                              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">
                                Performance
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {cls.students.map((student, idx) => (
                              <tr 
                                key={student.id} 
                                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                              >
                                <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                                  {student.admission_number}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {student.full_name}
                                </td>
                                <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                                  {student.overall_score}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
                                    student.overall_grade === 'A' ? 'bg-green-600' :
                                    student.overall_grade === 'B' ? 'bg-blue-600' :
                                    student.overall_grade === 'C' ? 'bg-yellow-600' :
                                    student.overall_grade === 'D' ? 'bg-orange-600' :
                                    'bg-red-600'
                                  }`}>
                                    {student.overall_grade}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    student.performance_rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                                    student.performance_rating === 'Very Good' ? 'bg-blue-100 text-blue-800' :
                                    student.performance_rating === 'Good' ? 'bg-cyan-100 text-cyan-800' :
                                    student.performance_rating === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                                    student.performance_rating === 'Poor' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {student.performance_rating}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No Selection Message */}
        {!state.selectedTerm && state.selectedSession && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600">👆 Select a term to view results</p>
          </div>
        )}
      </div>
    </div>
  )
}
