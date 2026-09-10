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

interface ClassResult {
  class_id: string
  class_name: string
  session_year: string
  term_name: string
  students: any[]
  class_average?: number
  pass_rate?: number
}

interface StudentResult {
  student_id: string
  student_name: string
  admission_number?: string
  overall_score?: number
  overall_grade?: string
  status?: 'PASS' | 'FAIL'
  subjects: any[]
}

export default function TeacherResultsAggregationPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Session & Term Selection
  const [sessions, setSessions] = useState<AcademicSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  // Class Data
  const [classData, setClassData] = useState<any>(null)
  const [students, setStudents] = useState<StudentResult[]>([])
  const [loadingResult, setLoadingResult] = useState(false)

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'grade'>('name')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pass' | 'fail'>('all')

  // Initialize
  useEffect(() => {
    initializeTeacher()
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
      loadClassResult()
    }
  }, [selectedTerm, user?.id])

  /**
   * Initialize teacher and verify access
   */
  const initializeTeacher = async () => {
    try {
      setLoading(true)
      setError(null)

      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        router.push('/landing')
        return
      }

      if (currentUser.role !== 'CLASS_TEACHER') {
        toast.error('Only Class Teachers can view class results')
        router.push('/teacher/dashboard')
        return
      }

      setUser(currentUser)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize'
      setError(message)
      console.error('[TeacherResultsAggregation] Init error:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load all academic sessions
   */
  const loadSessions = async () => {
    try {
      if (!user?.school_id) return

      const sessionsData = await AcademicSessionService.getAcademicSessions(user.school_id)

      if (sessionsData.length === 0) {
        setError('No academic sessions found')
        return
      }

      setSessions(sessionsData)

      // Auto-select first (most recent) session
      if (sessionsData.length > 0) {
        setSelectedSession(sessionsData[0].id)
      }
    } catch (err) {
      console.error('[TeacherResultsAggregation] Load sessions error:', err)
      toast.error('Failed to load sessions')
    }
  }

  /**
   * Load terms for selected session
   */
  const loadTerms = async () => {
    try {
      if (!selectedSession) return

      const termsData = await AcademicSessionService.getTerms(selectedSession)

      if (termsData.length === 0) {
        setError('No terms found for selected session')
        return
      }

      setTerms(termsData)

      // Auto-select first term
      if (termsData.length > 0) {
        setSelectedTerm(termsData[0].id)
      }
    } catch (err) {
      console.error('[TeacherResultsAggregation] Load terms error:', err)
      toast.error('Failed to load terms')
    }
  }

  /**
   * Load class result using ResultAggregationService
   */
  const loadClassResult = async () => {
    try {
      if (!user?.id || !selectedTerm || !user?.school_id) {
        setClassData(null)
        setStudents([])
        return
      }

      setLoadingResult(true)
      setError(null)

      // Get teacher's assigned class
      const { data: classAssignment } = await supabase
        .from('class_arm_combos')
        .select('id')
        .eq('class_teacher_id', user.id)
        .eq('school_id', user.school_id)
        .single()

      if (!classAssignment) {
        setError('You are not assigned as a class teacher to any class')
        setClassData(null)
        setStudents([])
        return
      }

      // Use ResultAggregationService
      const classResult = await ResultAggregationService.getClassResult(
        user.school_id,
        classAssignment.id,
        selectedTerm
      )

      if (!classResult) {
        setError('Failed to load class result')
        setClassData(null)
        setStudents([])
        return
      }

      setClassData(classResult)
      setStudents(classResult.students || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load result'
      setError(message)
      console.error('[TeacherResultsAggregation] Load result error:', err)
    } finally {
      setLoadingResult(false)
    }
  }

  /**
   * Filter and sort students
   */
  const getFilteredAndSortedStudents = () => {
    let filtered = students

    // Filter by status
    if (filterStatus === 'pass') {
      filtered = filtered.filter((s) => s.status === 'PASS')
    } else if (filterStatus === 'fail') {
      filtered = filtered.filter((s) => s.status === 'FAIL')
    }

    // Sort
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.student_name.localeCompare(b.student_name))
    } else if (sortBy === 'score') {
      filtered.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    } else if (sortBy === 'grade') {
      const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 }
      filtered.sort(
        (a, b) =>
          (gradeOrder[b.overall_grade as keyof typeof gradeOrder] || 0) -
          (gradeOrder[a.overall_grade as keyof typeof gradeOrder] || 0)
      )
    }

    return filtered
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const filteredStudents = getFilteredAndSortedStudents()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Class Results</h1>
          {classData && (
            <p className="text-gray-600 mb-4">
              <strong>{classData.class_name}</strong> | Class Teacher: <strong>{user.full_name}</strong>
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Session Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                disabled={sessions.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
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

          {/* Class Statistics */}
          {classData && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Class Average</p>
                  <p className="text-2xl font-bold text-purple-600">{classData.class_average}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pass Rate</p>
                  <p className="text-2xl font-bold text-green-600">{classData.pass_rate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-700">{students.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sorting & Filtering */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="score">Score (High to Low)</option>
                <option value="grade">Grade (Best to Worst)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter By</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Students</option>
                <option value="pass">Pass Only</option>
                <option value="fail">Fail Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingResult && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Loading class results...</p>
          </div>
        )}

        {/* Results Table */}
        {!loadingResult && filteredStudents.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-purple-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Admission #</th>
                  <th className="px-4 py-3 text-center">Overall Score</th>
                  <th className="px-4 py-3 text-center">Overall Grade</th>
                  <th className="px-4 py-3 text-center">Subjects</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.student_id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-800">{student.student_name}</td>
                    <td className="px-4 py-4 text-gray-700">{student.admission_number}</td>
                    <td className="px-4 py-4 text-center font-semibold text-gray-800">
                      {student.overall_score}
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-purple-600">
                      {student.overall_grade}
                    </td>
                    <td className="px-4 py-4 text-center text-gray-700">{student.subjects?.length || 0}</td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full font-semibold ${
                          student.status === 'PASS'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loadingResult && students.length === 0 && selectedTerm && (
          <div className="bg-yellow-50 rounded-lg shadow p-8 text-center border-l-4 border-yellow-600">
            <p className="text-yellow-700">No results available for this term</p>
          </div>
        )}

        {!loadingResult && students.length > 0 && filteredStudents.length === 0 && (
          <div className="bg-yellow-50 rounded-lg shadow p-8 text-center border-l-4 border-yellow-600">
            <p className="text-yellow-700">No students match the selected filter</p>
          </div>
        )}

        {!loadingResult && students.length === 0 && !selectedTerm && (
          <div className="bg-blue-50 rounded-lg shadow p-8 text-center border-l-4 border-blue-600">
            <p className="text-blue-700">Select a term above to view class results</p>
          </div>
        )}
      </div>
    </div>
  )
}
