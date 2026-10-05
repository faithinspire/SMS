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
