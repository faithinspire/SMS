'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { AcademicSessionService } from '@/services/academic-session.service'
import { ResultAggregationService } from '@/services/result-aggregation.service'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

interface StudentWithResult {
  student_id: string
  admission_number: string
  student_name: string
  class_name: string
  subjects: any[]
  overall_score: number
  overall_grade: string
  status: 'PASS' | 'FAIL'
}

export default function TeacherResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Session & Term
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  // Class Selection
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedClassName, setSelectedClassName] = useState<string>('')

  // Results
  const [studentResults, setStudentResults] = useState<StudentWithResult[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [classStats, setClassStats] = useState({
    totalStudents: 0,
    passCount: 0,
    failCount: 0,
    averageScore: 0,
  })

  // Initialize
  useEffect(() => {
    initialize()
  }, [])

  // Load sessions
  useEffect(() => {
    if (user?.school_id) {
      loadSessions()
    }
  }, [user?.school_id])

  // Load terms
  useEffect(() => {
    if (selectedSession) {
      loadTerms()
    }
  }, [selectedSession])

  // Load classes
  useEffect(() => {
    if (selectedTerm && user?.school_id) {
      loadClasses()
    }
  }, [selectedTerm, user?.school_id])

  // Load results
  useEffect(() => {
    if (selectedClass && selectedTerm && user?.school_id) {
      loadClassResults()
    }
  }, [selectedClass, selectedTerm, user?.school_id])

  const initialize = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER'].includes(currentUser.role)) {
        router.push('/auth/teacher/login')
        return
      }

      setUser(currentUser)
    } catch (err) {
      console.error('[TeacherResults] Init error:', err)
      toast.error('Failed to initialize')
      router.push('/landing')
    } finally {
      setLoading(false)
    }
  }

  const loadSessions = async () => {
    try {
      const data = await AcademicSessionService.getAcademicSessions(user.school_id)
      setSessions(data)
      if (data.length > 0) {
        setSelectedSession(data[0].id)
      }
    } catch (err) {
      console.error('[TeacherResults] Load sessions error:', err)
      toast.error('Failed to load sessions')
    }
  }

  const loadTerms = async () => {
    try {
      const data = await AcademicSessionService.getTerms(selectedSession)
      setTerms(data)
      if (data.length > 0) {
        setSelectedTerm(data[0].id)
      }
    } catch (err) {
      console.error('[TeacherResults] Load terms error:', err)
      toast.error('Failed to load terms')
    }
  }

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('class_arm_combos')
        .select('id, class_id, arm_id, classes(name), arms(name)')
        .eq('school_id', user.school_id)

      if (error) throw error

      setClasses(data || [])
      if (data && data.length > 0) {
        setSelectedClass(data[0].id)
        setSelectedClassName(`${data[0].classes?.name} ${data[0].arms?.name}`)
      }
    } catch (err) {
      console.error('[TeacherResults] Load classes error:', err)
      toast.error('Failed to load classes')
    }
  }

  const loadClassResults = async () => {
    try {
      setLoadingResults(true)

      // Get all students in class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, admission_number, user_id')
        .eq('school_id', user.school_id)
        .eq('class_arm_combo_id', selectedClass)
        .order('admission_number', { ascending: true })

      if (studentsError) throw studentsError

      if (!students || students.length === 0) {
        setStudentResults([])
        setClassStats({
          totalStudents: 0,
          passCount: 0,
          failCount: 0,
          averageScore: 0,
        })
        return
      }

      // Fetch results for all students
      const results: StudentWithResult[] = []
      let totalScore = 0
      let passCount = 0

      for (const student of students) {
        const result = await ResultAggregationService.getStudentResult(
          user.school_id,
          student.id,
          selectedTerm
        )

        if (result) {
          results.push({
            student_id: student.id,
            admission_number: student.admission_number,
            student_name: result.student_name,
            class_name: result.class_name,
            subjects: result.subjects,
            overall_score: result.overall_score || 0,
            overall_grade: result.overall_grade || 'N/A',
            status: result.status || 'PASS',
          })

          totalScore += result.overall_score || 0
          if (result.status === 'PASS') {
            passCount++
          }
        }
      }

      setStudentResults(results)
      setClassStats({
        totalStudents: results.length,
        passCount,
        failCount: results.length - passCount,
        averageScore: results.length > 0 ? Math.round(totalScore / results.length) : 0,
      })

      console.log(`[TeacherResults] Loaded ${results.length} student results`)
    } catch (err) {
      console.error('[TeacherResults] Load results error:', err)
      toast.error('Failed to load class results')
    } finally {
      setLoadingResults(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">📊 Class Results - Combined Scores</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Session</label>
            <select 
              value={selectedSession} 
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.session_year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Term</label>
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.term_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.classes?.name} {c.arms?.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Class Statistics */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-indigo-600">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Class Statistics - {selectedClassName}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-gray-200">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-800">{classStats.totalStudents}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-300">
              <p className="text-sm text-gray-600">Pass Count</p>
              <p className="text-3xl font-bold text-green-600">{classStats.passCount}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-2 border-red-300">
              <p className="text-sm text-gray-600">Fail Count</p>
              <p className="text-3xl font-bold text-red-600">{classStats.failCount}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-300">
              <p className="text-sm text-gray-600">Class Average</p>
              <p className="text-3xl font-bold text-blue-600">{classStats.averageScore}</p>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
          <h2 className="text-xl font-bold text-gray-800 mb-4">👥 Student Results (Manual + CBT Combined)</h2>

          {loadingResults ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading student results...</p>
            </div>
          ) : studentResults.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No results available for this class</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Admission No.</th>
                    <th className="px-4 py-3 text-left font-semibold">Student Name</th>
                    <th className="px-4 py-3 text-center font-semibold">Subjects</th>
                    <th className="px-4 py-3 text-center font-semibold">Overall Score</th>
                    <th className="px-4 py-3 text-center font-semibold">Grade</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentResults.map((result) => (
                    <tr 
                      key={result.student_id}
                      onClick={() => router.push(`/teacher/results/${result.student_id}`)}
                      className={`border-b hover:bg-gray-100 cursor-pointer transition ${result.status === 'PASS' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-800">{result.admission_number}</td>
                      <td className="px-4 py-3 text-gray-700">{result.student_name}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">{result.subjects.length}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-600 text-lg">{result.overall_score}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-600 text-lg">{result.overall_grade}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${
                          result.status === 'PASS' 
                            ? 'bg-green-200 text-green-800 border border-green-400'
                            : result.status === 'FAIL'
                            ? 'bg-red-200 text-red-800 border border-red-400'
                            : 'bg-yellow-200 text-yellow-800 border border-yellow-400'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Info */}
        {studentResults.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mt-6">
            <p className="text-blue-800">
              <strong>📊 Note:</strong> These results combine both manual teacher scores and CBT test scores. 
              Each subject includes CA1-4 (CBT tests mapped: Test 1→CA1, 2→CA2, 3→CA3, 4→CA4), Exam score, and Overall grade.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
