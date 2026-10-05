'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
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
  students: StudentScore[]
}

interface StudentScore {
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
  loadingClasses: boolean
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
    loadingClasses: false,
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

  const loadInitialData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || (currentUser.role !== 'SCHOOL_ADMIN' && currentUser.role !== 'ADMIN')) {
        router.push('/landing')
        return
      }

      if (!currentUser.school_id) {
        setState(s => ({ 
          ...s, 
          error: '❌ Your account is not linked to a school. Contact your administrator.', 
          loading: false 
        }))
        return
      }

      // Load school data
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .maybeSingle()

      setState(s => ({ ...s, user: currentUser, school: schoolData }))

      // Load sessions
      await loadSessions(currentUser.school_id)
      setState(s => ({ ...s, loading: false }))
    } catch (err: any) {
      console.error('[Results] Error loading initial data:', err)
      setState(s => ({ ...s, error: `❌ ${err.message}`, loading: false }))
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

      const validSessions = data.filter(s => s.session_year)
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

      const response = await fetch(
        `/api/results/school-classes-and-students?schoolId=${state.user.school_id}&termId=${state.selectedTerm}`
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

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
    const display = session.session_year || 'Unknown'
    const indicator = session.is_active ? ' ✓ Current' : ''
    return `${display}${indicator}`
  }

  const getSelectedTermName = () => {
    const term = state.terms.find(t => t.id === state.selectedTerm)
    return term ? (term.name || `Term ${term.term_number}`) : 'Select a term'
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

  // Main render
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
