'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { AcademicSessionService } from '@/services/academic-session.service'
import { ResultAggregationService } from '@/services/result-aggregation.service'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

interface AcademicSession {
  id: string
  session_year: string
}

interface Term {
  id: string
  term_name: string
}

interface StudentResult {
  student_id: string
  student_name: string
  admission_number?: string
  class_name?: string
  session_year: string
  term_name: string
  subjects: any[]
  overall_score?: number
  overall_grade?: string
  status?: 'PASS' | 'FAIL'
}

export default function StudentResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Session & Term Selection
  const [sessions, setSessions] = useState<AcademicSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  // Result Data
  const [result, setResult] = useState<StudentResult | null>(null)
  const [loadingResult, setLoadingResult] = useState(false)

  // Initialize
  useEffect(() => {
    initializeStudent()
  }, [])

  // Load sessions on mount
  useEffect(() => {
    if (user?.school_id) {
      loadSessions()
    }
  }, [user?.school_id])

  // Load terms when session changes
  useEffect(() => {
    if (selectedSession) {
      loadTerms()
    } else {
      setTerms([])
      setSelectedTerm('')
    }
  }, [selectedSession])

  // Load result when term changes
  useEffect(() => {
    if (selectedTerm && user?.id) {
      loadResult()
    }
  }, [selectedTerm, user?.id])

  /**
   * Initialize student and verify access
   */
  const initializeStudent = async () => {
    try {
      setLoading(true)
      setError(null)

      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        router.push('/landing')
        return
      }

      if (currentUser.role !== 'STUDENT') {
        toast.error('Only students can access this page')
        router.push('/landing')
        return
      }

      setUser(currentUser)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize'
      setError(message)
      console.error('[StudentResults] Init error:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load all academic sessions
   */
  const loadSessions = async () => {
    try {
      if (!user?.school_id) {
        console.log('[StudentResults] No school_id')
        return
      }

      console.log('[StudentResults] Loading sessions for school:', user.school_id)
      const sessionsData = await AcademicSessionService.getAcademicSessions(user.school_id)

      console.log('[StudentResults] Sessions loaded:', sessionsData.length)

      if (sessionsData.length === 0) {
        console.warn('[StudentResults] No sessions found')
        setError('No academic sessions found')
        return
      }

      setSessions(sessionsData)

      // Auto-select first (most recent) session
      if (sessionsData.length > 0) {
        console.log('[StudentResults] Auto-selecting session:', sessionsData[0].session_year)
        setSelectedSession(sessionsData[0].id)
      }
    } catch (err) {
      console.error('[StudentResults] Load sessions error:', err)
      setError(`Failed to load sessions: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Load terms for selected session
   */
  const loadTerms = async () => {
    try {
      if (!selectedSession) {
        console.log('[StudentResults] No session selected')
        return
      }

      console.log('[StudentResults] Loading terms for session:', selectedSession)
      const termsData = await AcademicSessionService.getTerms(selectedSession)

      console.log('[StudentResults] Terms loaded:', termsData.length)

      if (termsData.length === 0) {
        console.warn('[StudentResults] No terms found')
        setError('No terms found for selected session')
        return
      }

      setTerms(termsData)

      // Auto-select first term
      if (termsData.length > 0) {
        console.log('[StudentResults] Auto-selecting term:', termsData[0].term_name)
        setSelectedTerm(termsData[0].id)
      }
    } catch (err) {
      console.error('[StudentResults] Load terms error:', err)
      setError(`Failed to load terms: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Load student's result for selected term
   */
  const loadResult = async () => {
    try {
      if (!user?.id || !selectedTerm || !user?.school_id) {
        console.log('[StudentResults] Missing: user_id, selectedTerm, or school_id')
        setResult(null)
        return
      }

      setLoadingResult(true)
      setError(null)

      console.log('[StudentResults] Loading result for term:', selectedTerm)

      // Get student's actual student record ID
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .single()

      if (studentError) {
        console.error('[StudentResults] Error fetching student record:', studentError)
        setError('Student record not found')
        setResult(null)
        return
      }

      if (!studentRecord) {
        console.warn('[StudentResults] No student record found')
        setError('Student record not found')
        setResult(null)
        return
      }

      console.log('[StudentResults] Student record:', studentRecord.id)

      // Use ResultAggregationService to get the result
      const studentResult = await ResultAggregationService.getStudentResult(
        user.school_id,
        studentRecord.id,
        selectedTerm
      )

      console.log('[StudentResults] Result loaded:', studentResult?.subjects?.length || 0, 'subjects')

      if (!studentResult) {
        console.warn('[StudentResults] No result for this term')
        setResult(null)
        return
      }

      setResult(studentResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load result'
      console.error('[StudentResults] Load result error:', err)
      setError(message)
    } finally {
      setLoadingResult(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Results</h1>
          <p className="text-gray-600 mb-6">
            <strong>{user.full_name}</strong>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4">
            {/* Session Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                disabled={sessions.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select Session...</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_year}
                  </option>
                ))}
              </select>
            </div>

            {/* Term Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                disabled={terms.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select Term...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.term_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingResult && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Loading your result...</p>
          </div>
        )}

        {/* Result Display */}
        {!loadingResult && result && (
          <>
            {/* Result Header */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Admission Number</p>
                  <p className="text-lg font-semibold text-gray-800">{result.admission_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Class</p>
                  <p className="text-lg font-semibold text-gray-800">{result.class_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Session</p>
                  <p className="text-lg font-semibold text-gray-800">{result.session_year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Term</p>
                  <p className="text-lg font-semibold text-gray-800">{result.term_name}</p>
                </div>
              </div>

              {/* Overall Performance */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Overall Score</p>
                    <p className="text-2xl font-bold text-indigo-600">{result.overall_score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Overall Grade</p>
                    <p className="text-2xl font-bold text-indigo-600">{result.overall_grade}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p
                      className={`text-2xl font-bold ${
                        result.status === 'PASS' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {result.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* CBT Info Box */}
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mt-4">
                <p className="text-blue-800 text-sm">
                  <strong>📊 Score Information:</strong> This result includes both traditional teacher assessments and CBT test scores. 
                  CBT test slots are mapped to CA columns (Test 1→CA1, Test 2→CA2, Test 3→CA3, Test 4→CA4). 
                  Subjects marked with <span className="font-bold">CBT TESTS</span> contain only CBT scores.
                </p>
              </div>
            </div>

            {/* Subjects Table */}
            {result.subjects && result.subjects.length > 0 ? (
              <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-indigo-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-center">CA1</th>
                      <th className="px-4 py-3 text-center">CA2</th>
                      <th className="px-4 py-3 text-center">CA3</th>
                      <th className="px-4 py-3 text-center">CA4</th>
                      <th className="px-4 py-3 text-center">CA/40</th>
                      <th className="px-4 py-3 text-center">Exam</th>
                      <th className="px-4 py-3 text-center">Total</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subjects.map((subject, idx) => (
                      <tr key={idx} className={`border-b hover:bg-gray-50 ${subject.is_cbt_test ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          <div>
                            {subject.subject_name}
                            {subject.is_cbt_test && (
                              <span className="ml-2 inline-block px-2 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded">
                                CBT TESTS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-gray-700 font-semibold">
                          {subject.ca1 !== null && subject.ca1 !== undefined ? subject.ca1.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-700 font-semibold">
                          {subject.ca2 !== null && subject.ca2 !== undefined ? subject.ca2.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-700 font-semibold">
                          {subject.ca3 !== null && subject.ca3 !== undefined ? subject.ca3.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-700 font-semibold">
                          {subject.ca4 !== null && subject.ca4 !== undefined ? subject.ca4.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-gray-700 bg-yellow-50">
                          {subject.ca1 || subject.ca2 || subject.ca3 || subject.ca4 ? 
                            ((subject.ca1 || 0) + (subject.ca2 || 0) + (subject.ca3 || 0) + (subject.ca4 || 0)).toFixed(1)
                            : '-'}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-700 font-semibold">
                          {subject.exam !== null && subject.exam !== undefined ? subject.exam.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-lg text-indigo-700 bg-indigo-50">
                          {subject.total.toFixed(1)}
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-indigo-600">
                          {subject.grade}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-700 text-sm">{subject.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-lg shadow p-8 text-center border-l-4 border-blue-600">
                <p className="text-blue-700">No subject scores available for this term</p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loadingResult && !result && selectedTerm && (
          <div className="bg-yellow-50 rounded-lg shadow p-8 text-center border-l-4 border-yellow-600">
            <p className="text-yellow-700">No results available for this term yet</p>
          </div>
        )}

        {!loadingResult && !result && !selectedTerm && (
          <div className="bg-blue-50 rounded-lg shadow p-8 text-center border-l-4 border-blue-600">
            <p className="text-blue-700">Select a term above to view your results</p>
          </div>
        )}
      </div>
    </div>
  )
}
