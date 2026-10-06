'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { StaffHeader } from '@/components/StaffHeader'
import { toast } from 'react-hot-toast'

const supabase = createClient()

interface Session {
  id: string
  session_year: string
  start_year: number
  end_year: number
  is_active: boolean
}

interface Term {
  id: string
  session_id: string
  term_number: number
  name: string
  is_active: boolean
}

interface ClassArm {
  id: string
  class_name: string
  arm_name: string
  student_count: number
}

interface StudentResult {
  id: string
  admission_number: string
  full_name: string
  overall_score: number
  overall_grade: string
  performance_rating: string
}

interface PageState {
  loading: boolean
  error: string | null
  user: any
  school: any
  sessions: Session[]
  selectedSession: string | null
  terms: Term[]
  selectedTerm: string | null
  loadingTerms: boolean
  classes: ClassArm[]
  selectedClass: string | null
  loadingClasses: boolean
  students: StudentResult[]
  loadingStudents: boolean
}

export default function ResultsPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>({
    loading: true,
    error: null,
    user: null,
    school: null,
    sessions: [],
    selectedSession: null,
    terms: [],
    selectedTerm: null,
    loadingTerms: false,
    classes: [],
    selectedClass: null,
    loadingClasses: false,
    students: [],
    loadingStudents: false,
  })

  // Initialize on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load terms when session changes
  useEffect(() => {
    if (state.selectedSession) {
      loadTerms()
    }
  }, [state.selectedSession])

  // Load classes when term changes
  useEffect(() => {
    if (state.selectedTerm) {
      loadClasses()
    }
  }, [state.selectedTerm])

  // Load students when class changes
  useEffect(() => {
    if (state.selectedClass) {
      loadStudents()
    }
  }, [state.selectedClass])

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/landing')
        return
      }

      // Get user profile with school_id
      const { data: userProfile } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!userProfile || !userProfile.school_id) {
        setState(s => ({
          ...s,
          error: '❌ Your account is not linked to a school. Contact your administrator.',
          loading: false,
        }))
        return
      }

      setState(s => ({ ...s, user: userProfile }))

      // Load school data
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', userProfile.school_id)
        .maybeSingle()

      setState(s => ({ ...s, school: schoolData }))

      // Load sessions - real-time
      await loadSessions(userProfile.school_id)
      setState(s => ({ ...s, loading: false }))
    } catch (error) {
      console.error('[Results] Error loading initial data:', error)
      setState(s => ({
        ...s,
        error: error instanceof Error ? error.message : 'Failed to load data',
        loading: false,
      }))
    }
  }

  const loadSessions = async (schoolId: string) => {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('id, session_year, start_year, end_year, is_active')
        .eq('school_id', schoolId)
        .order('start_year', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        setState(s => ({
          ...s,
          sessions: [],
          selectedSession: null,
          error: '📭 No academic sessions found. Create sessions first.',
        }))
        return
      }

      setState(s => ({
        ...s,
        sessions: data,
        selectedSession: data.length > 0 ? data[0].id : null,
        terms: [],
        selectedTerm: null,
        classes: [],
        selectedClass: null,
        students: [],
        error: '',
      }))
    } catch (error) {
      console.error('[Results] Error loading sessions:', error)
      toast.error('Failed to load sessions')
    }
  }

  const loadTerms = async () => {
    try {
      if (!state.selectedSession || !state.user?.school_id) return

      setState(s => ({ ...s, loadingTerms: true }))

      const { data, error } = await supabase
        .from('academic_terms')
        .select('id, session_id, term_number, name, is_active')
        .eq('session_id', state.selectedSession)
        .eq('school_id', state.user.school_id)
        .order('term_number', { ascending: true })

      if (error) throw error

      setState(s => ({
        ...s,
        terms: data || [],
        selectedTerm: data && data.length > 0 ? data[0].id : null,
        classes: [],
        selectedClass: null,
        students: [],
        loadingTerms: false,
      }))
    } catch (error) {
      console.error('[Results] Error loading terms:', error)
      setState(s => ({ ...s, loadingTerms: false }))
      toast.error('Failed to load terms')
    }
  }

  const loadClasses = async () => {
    try {
      if (!state.selectedTerm || !state.user?.school_id) return

      setState(s => ({ ...s, loadingClasses: true }))

      // Get classes for this term
      const { data, error } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          class:class_id (id, name),
          arm:arm_id (id, name)
        `)
        .eq('school_id', state.user.school_id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Count students for each class
      const classesWithCounts = await Promise.all(
        (data || []).map(async (combo) => {
          const { count } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('class_arm_combo_id', combo.id)
            .eq('school_id', state.user.school_id)

          return {
            id: combo.id,
            class_name: combo.class?.name || 'Unknown',
            arm_name: combo.arm?.name || 'N/A',
            student_count: count || 0,
          }
        })
      )

      setState(s => ({
        ...s,
        classes: classesWithCounts,
        selectedClass: classesWithCounts.length > 0 ? classesWithCounts[0].id : null,
        students: [],
        loadingClasses: false,
      }))
    } catch (error) {
      console.error('[Results] Error loading classes:', error)
      setState(s => ({ ...s, loadingClasses: false }))
      toast.error('Failed to load classes')
    }
  }

  const loadStudents = async () => {
    try {
      if (!state.selectedClass || !state.selectedTerm) return

      setState(s => ({ ...s, loadingStudents: true }))

      // Get students for this class
      const { data: studentsData, error: studentError } = await supabase
        .from('students')
        .select('id, user_id, admission_number')
        .eq('class_arm_combo_id', state.selectedClass)
        .order('user_id', { ascending: true })

      if (studentError) throw studentError

      if (!studentsData || studentsData.length === 0) {
        setState(s => ({
          ...s,
          students: [],
          loadingStudents: false,
        }))
        return
      }

      // Get student names and scores
      const studentsWithScores = await Promise.all(
        (studentsData || []).map(async (student) => {
          // Get student name
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', student.user_id)
            .maybeSingle()

          // Get student score
          const { data: scoreData } = await supabase
            .from('score_sheets')
            .select('overall_score, overall_grade, performance_rating')
            .eq('student_id', student.id)
            .eq('term_id', state.selectedTerm)
            .maybeSingle()

          return {
            id: student.id,
            admission_number: student.admission_number || 'N/A',
            full_name: userData?.full_name || 'Unknown',
            overall_score: scoreData?.overall_score || 0,
            overall_grade: scoreData?.overall_grade || 'N/A',
            performance_rating: scoreData?.performance_rating || 'No Rating',
          }
        })
      )

      setState(s => ({
        ...s,
        students: studentsWithScores,
        loadingStudents: false,
      }))
    } catch (error) {
      console.error('[Results] Error loading students:', error)
      setState(s => ({ ...s, loadingStudents: false }))
      toast.error('Failed to load students')
    }
  }

  const getSessionYear = () => {
    const session = state.sessions.find(s => s.id === state.selectedSession)
    return session ? session.session_year : 'Select a session'
  }

  const getTermName = () => {
    const term = state.terms.find(t => t.id === state.selectedTerm)
    return term ? term.name || `Term ${term.term_number}` : 'Select a term'
  }

  const getClassName = () => {
    const cls = state.classes.find(c => c.id === state.selectedClass)
    return cls ? `${cls.class_name} ${cls.arm_name}` : 'Select a class'
  }

  // Loading state
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

  // Error state
  if (state.error && state.sessions.length === 0) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-700 font-semibold">{state.error}</p>
        <button
          onClick={() => loadInitialData()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50">
        <StaffHeader
          staffName="School Administrator"
          schoolName={state.school?.name || 'School'}
          section="Results Management"
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {state.error && state.sessions.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700">
            {state.error}
          </div>
        )}

        {/* Selectors Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Session Selector */}
          <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-blue-600">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📅 Academic Session
            </label>
            <select
              value={state.selectedSession || ''}
              onChange={(e) =>
                setState(s => ({
                  ...s,
                  selectedSession: e.target.value || null,
                  selectedTerm: null,
                  selectedClass: null,
                  terms: [],
                  classes: [],
                  students: [],
                }))
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none bg-white"
            >
              <option value="">Select a session</option>
              {state.sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.session_year}
                  {session.is_active ? ' ✓ Active' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Term Selector */}
          <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-purple-600">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📋 Term
            </label>
            <select
              value={state.selectedTerm || ''}
              onChange={(e) =>
                setState(s => ({
                  ...s,
                  selectedTerm: e.target.value || null,
                  selectedClass: null,
                  classes: [],
                  students: [],
                }))
              }
              disabled={!state.selectedSession || state.loadingTerms}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {state.loadingTerms ? '⏳ Loading...' : 'Select a term'}
              </option>
              {state.terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name || `Term ${term.term_number}`}
                  {term.is_active ? ' (Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-green-600">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🎓 Class
            </label>
            <select
              value={state.selectedClass || ''}
              onChange={(e) =>
                setState(s => ({
                  ...s,
                  selectedClass: e.target.value || null,
                  students: [],
                }))
              }
              disabled={!state.selectedTerm || state.loadingClasses}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {state.loadingClasses ? '⏳ Loading...' : 'Select a class'}
              </option>
              {state.classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name} {cls.arm_name} ({cls.student_count} students)
                </option>
              ))}
            </select>
          </div>

          {/* Students Count */}
          <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-orange-600 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700">👥 Students</p>
              <p className="text-3xl font-bold text-orange-600">{state.students.length}</p>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {state.selectedClass && (
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                📊 Results - {getSessionYear()} • {getTermName()}
              </h2>
              <p className="text-gray-600 mt-2">Class: {getClassName()}</p>
            </div>

            {state.loadingStudents ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading student results...</p>
              </div>
            ) : state.students.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-600">📭 No students in this class</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold">Admission #</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Student Name</th>
                      <th className="px-6 py-3 text-center text-sm font-bold">Score</th>
                      <th className="px-6 py-3 text-center text-sm font-bold">Grade</th>
                      <th className="px-6 py-3 text-left text-sm font-bold">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {state.students.map((student, idx) => (
                      <tr
                        key={student.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-6 py-4 font-semibold text-gray-700">
                          {student.admission_number}
                        </td>
                        <td className="px-6 py-4 text-gray-700">{student.full_name}</td>
                        <td className="px-6 py-4 text-center font-bold text-gray-900">
                          {student.overall_score}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
                              student.overall_grade === 'A'
                                ? 'bg-green-600'
                                : student.overall_grade === 'B'
                                ? 'bg-blue-600'
                                : student.overall_grade === 'C'
                                ? 'bg-yellow-600'
                                : student.overall_grade === 'D'
                                ? 'bg-orange-600'
                                : 'bg-red-600'
                            }`}
                          >
                            {student.overall_grade}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              student.performance_rating === 'Excellent'
                                ? 'bg-green-100 text-green-800'
                                : student.performance_rating === 'Very Good'
                                ? 'bg-blue-100 text-blue-800'
                                : student.performance_rating === 'Good'
                                ? 'bg-cyan-100 text-cyan-800'
                                : student.performance_rating === 'Fair'
                                ? 'bg-yellow-100 text-yellow-800'
                                : student.performance_rating === 'Poor'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
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
        )}

        {/* No Selection Message */}
        {!state.selectedClass && state.selectedSession && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 text-lg">👆 Select a class to view student results</p>
          </div>
        )}
      </div>
    </div>
  )
}
