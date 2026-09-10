'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { AcademicSessionService } from '@/services/academic-session.service'
import { supabase } from '@/lib/supabase-client'
import { calculateGrade, formatGradeWithRemark } from '@/utils/grading'
import { calculateScores, validateScores, MAX_SCORES } from '@/utils/scoring'
import toast from 'react-hot-toast'

interface StudentWithSubjects {
  student_id: string
  admission_number: string
  student_name: string
  user_id: string
  subjects: SubjectScoreRow[]
}

interface SubjectScoreRow {
  score_id?: string
  subject_id: string
  subject_name: string
  ca1: number | null
  ca2: number | null
  ca3: number | null
  ca4: number | null
  exam: number | null
  caTotal: number
  total: number
  grade: string
  isDirty: boolean
}

interface AcademicSession {
  id: string
  session_year: string
}

interface Term {
  id: string
  term_name: string
}

export default function ClassScoreSheetPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Session & Term Selection
  const [sessions, setSessions] = useState<AcademicSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  // Student & Score Data
  const [students, setStudents] = useState<StudentWithSubjects[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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

  // Load class students when term changes
  useEffect(() => {
    if (selectedTerm && selectedSession) {
      loadClassStudents()
    } else {
      setStudents([])
    }
  }, [selectedTerm, selectedSession])

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

      // Only class teachers can access this page
      if (currentUser.role !== 'CLASS_TEACHER') {
        toast.error('Only Class Teachers can access this page')
        router.push('/teacher/dashboard')
        return
      }

      setUser(currentUser)

      // Get school name
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', currentUser.school_id)
        .single()

      if (schoolData) {
        setSchool(schoolData)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize'
      setError(message)
      console.error('[ClassScoreSheet] Init error:', err)
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
        setError('No academic sessions found. Please contact administrator.')
        toast.error('No academic sessions found')
        return
      }

      setSessions(sessionsData)

      // Auto-select first (most recent) session
      if (sessionsData.length > 0) {
        setSelectedSession(sessionsData[0].id)
      }
    } catch (err) {
      console.error('[ClassScoreSheet] Load sessions error:', err)
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
        toast.error('No terms found')
        return
      }

      setTerms(termsData)

      // Auto-select first term
      if (termsData.length > 0) {
        setSelectedTerm(termsData[0].id)
      }
    } catch (err) {
      console.error('[ClassScoreSheet] Load terms error:', err)
      toast.error('Failed to load terms')
    }
  }

  /**
   * Load all students in teacher's assigned class with their scores for this term
   */
  const loadClassStudents = useCallback(async () => {
    try {
      if (!user?.id || !selectedTerm || !user?.school_id) {
        setStudents([])
        return
      }

      setLoadingStudents(true)
      setError(null)

      // Step 1: Get teacher's assigned class
      const { data: classAssignment } = await supabase
        .from('class_arm_combos')
        .select('id, class_id, arm_id')
        .eq('class_teacher_id', user.id)
        .eq('school_id', user.school_id)
        .single()

      if (!classAssignment) {
        setError('You are not assigned as a class teacher to any class')
        toast.error('No class assignment found')
        setStudents([])
        return
      }

      // Step 2: Get all students in this class - Try multiple approaches
      let classStudents: any[] = []
      let studentError: any
      
      // First attempt: With school_id filter
      const { data: students1, error: error1 } = await supabase
        .from('students')
        .select('id, admission_number, user_id, users(full_name)')
        .eq('class_arm_combo_id', classAssignment.id)
        .eq('school_id', user.school_id)
        .order('users(full_name)', { ascending: true })

      if (students1 && students1.length > 0) {
        classStudents = students1
        console.log('[ClassSheet] Found students with school filter:', students1.length)
      } else if (error1) {
        console.error('[ClassSheet] Query error 1:', error1)
        studentError = error1
      } else {
        // Fallback: Try without school_id filter
        console.log('[ClassSheet] No students with school_id filter, trying without...')
        const { data: students2, error: error2 } = await supabase
          .from('students')
          .select('id, admission_number, user_id, users(full_name)')
          .eq('class_arm_combo_id', classAssignment.id)
          .order('users(full_name)', { ascending: true })

        if (students2 && students2.length > 0) {
          classStudents = students2
          console.log('[ClassSheet] Found students without school filter:', students2.length)
        } else if (error2) {
          console.error('[ClassSheet] Query error 2:', error2)
          studentError = error2
        } else {
          console.log('[ClassSheet] No students found - getting debug info...')
          const { data: allStudents } = await supabase
            .from('students')
            .select('id, admission_number, class_arm_combo_id, school_id')
            .limit(5)
          console.log('[ClassSheet] Debug - Sample students:', allStudents)
          console.log('[ClassSheet] Looking for class_arm_combo_id:', classAssignment.id)
        }
      }

      if (studentError) {
        throw studentError
      }

      if (!classStudents || classStudents.length === 0) {
        setStudents([])
        toast.info('No students in your class')
        return
      }

      // Step 3: Get students' subject enrollments
      const studentIds = classStudents.map((s) => s.id)

      const { data: subjectEnrollments } = await supabase
        .from('student_subjects')
        .select('student_id, subject_id, subjects(name)')
        .in('student_id', studentIds)
        .eq('school_id', user.school_id)

      // Build subject map
      const studentSubjectMap = new Map<string, any[]>()
      subjectEnrollments?.forEach((enrollment: any) => {
        if (!studentSubjectMap.has(enrollment.student_id)) {
          studentSubjectMap.set(enrollment.student_id, [])
        }
        studentSubjectMap.get(enrollment.student_id)?.push(enrollment)
      })

      // Step 4: Get existing scores for this term
      const { data: existingScores } = await supabase
        .from('score_sheets')
        .select('id, student_id, subject_id, test1, test2, test3, test4, exam')
        .in('student_id', studentIds)
        .eq('term_id', selectedTerm)
        .eq('school_id', user.school_id)

      // Build score map
      const scoreMap = new Map<string, any>()
      existingScores?.forEach((score: any) => {
        scoreMap.set(`${score.student_id}:${score.subject_id}`, score)
      })

      // Step 5: Build student rows with their subjects and scores
      const studentsData: StudentWithSubjects[] = classStudents.map((student: any) => {
        const studentSubjects = studentSubjectMap.get(student.id) || []

        const subjectRows: SubjectScoreRow[] = studentSubjects.map((enrollment: any) => {
          const scoreKey = `${student.id}:${enrollment.subject_id}`
          const existingScore = scoreMap.get(scoreKey)

          const scores = calculateScores({
            ca1: existingScore?.test1,
            ca2: existingScore?.test2,
            ca3: existingScore?.test3,
            ca4: existingScore?.test4,
            exam: existingScore?.exam,
          })

          const gradeInfo = calculateGrade(scores.total)

          return {
            score_id: existingScore?.id,
            subject_id: enrollment.subject_id,
            subject_name: enrollment.subjects?.name || 'Unknown',
            ca1: existingScore?.test1 || null,
            ca2: existingScore?.test2 || null,
            ca3: existingScore?.test3 || null,
            ca4: existingScore?.test4 || null,
            exam: existingScore?.exam || null,
            caTotal: scores.caTotal,
            total: scores.total,
            grade: gradeInfo.grade,
            isDirty: false,
          }
        })

        return {
          student_id: student.id,
          admission_number: student.admission_number,
          student_name: (student.users as any)?.full_name || 'Unknown',
          user_id: student.user_id,
          subjects: subjectRows,
        }
      })

      setStudents(studentsData)
      setHasUnsavedChanges(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load students'
      setError(message)
      console.error('[ClassScoreSheet] Load students error:', err)
      toast.error(message)
    } finally {
      setLoadingStudents(false)
    }
  }, [user?.id, selectedTerm, user?.school_id])

  /**
   * Update a score value
   */
  const updateScore = (
    studentId: string,
    subjectId: string,
    field: 'ca1' | 'ca2' | 'ca3' | 'ca4' | 'exam',
    value: number | null
  ) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => {
        if (student.student_id !== studentId) return student

        return {
          ...student,
          subjects: student.subjects.map((subject) => {
            if (subject.subject_id !== subjectId) return subject

            // Create updated score object
            const updated = { ...subject, [field]: value, isDirty: true }

            // Recalculate totals and grade
            const scores = calculateScores({
              ca1: updated.ca1,
              ca2: updated.ca2,
              ca3: updated.ca3,
              ca4: updated.ca4,
              exam: updated.exam,
            })

            updated.caTotal = scores.caTotal
            updated.total = scores.total
            updated.grade = calculateGrade(scores.total).grade

            return updated
          }),
        }
      })
    )

    setHasUnsavedChanges(true)
  }

  /**
   * Save all scores for a student's subjects
   */
  const saveStudentScores = async (studentId: string) => {
    try {
      setSaving(true)
      setError(null)

      const student = students.find((s) => s.student_id === studentId)
      if (!student) {
        toast.error('Student not found')
        return
      }

      // Filter only dirty/modified scores
      const dirtyScores = student.subjects.filter((s) => s.isDirty)

      if (dirtyScores.length === 0) {
        toast.info('No changes to save')
        return
      }

      // Validate all dirty scores
      for (const score of dirtyScores) {
        const validation = validateScores({
          ca1: score.ca1,
          ca2: score.ca2,
          ca3: score.ca3,
          ca4: score.ca4,
          exam: score.exam,
        })

        if (!validation.isValid) {
          toast.error(`${score.subject_name}: ${validation.errors[0]}`)
          return
        }
      }

      // Save each score via API
      for (const score of dirtyScores) {
        const response = await fetch('/api/subject-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_id: user.school_id,
            student_id: studentId,
            subject_id: score.subject_id,
            term_id: selectedTerm,
            test1: score.ca1,
            test2: score.ca2,
            test3: score.ca3,
            test4: score.ca4,
            exam: score.exam,
            source: 'MANUAL', // Class teacher entry
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to save ${score.subject_name}`)
        }
      }

      // Mark all as clean
      setStudents((prevStudents) =>
        prevStudents.map((s) => {
          if (s.student_id !== studentId) return s
          return {
            ...s,
            subjects: s.subjects.map((subj) => ({ ...subj, isDirty: false })),
          }
        })
      )

      toast.success(`Saved ${dirtyScores.length} score(s) for ${student.student_name}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save scores'
      setError(message)
      console.error('[ClassScoreSheet] Save error:', err)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Save all changes
   */
  const saveAllChanges = async () => {
    try {
      setSaving(true)
      setError(null)

      // Find all students with dirty scores
      const studentsWithChanges = students.filter((s) =>
        s.subjects.some((subj) => subj.isDirty)
      )

      if (studentsWithChanges.length === 0) {
        toast.info('No changes to save')
        return
      }

      // Save each student
      for (const student of studentsWithChanges) {
        await saveStudentScores(student.student_id)
      }

      setHasUnsavedChanges(false)
      toast.success('All scores saved successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save all scores'
      console.error('[ClassScoreSheet] Save all error:', err)
      toast.error(message)
    } finally {
      setSaving(false)
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Class Score Sheet</h1>
          {school && (
            <p className="text-gray-600 mb-4">
              <strong>{school.name}</strong> | Class Teacher: <strong>{user.full_name}</strong>
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
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

          {/* Save All Button */}
          {hasUnsavedChanges && (
            <button
              onClick={saveAllChanges}
              disabled={saving || loadingStudents}
              className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          )}
        </div>

        {/* Loading State */}
        {loadingStudents && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Loading students and scores...</p>
          </div>
        )}

        {/* Students Score Table */}
        {!loadingStudents && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Admission #</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-center">CA1/10</th>
                  <th className="px-4 py-3 text-center">CA2/10</th>
                  <th className="px-4 py-3 text-center">CA3/10</th>
                  <th className="px-4 py-3 text-center">CA4/10</th>
                  <th className="px-4 py-3 text-center">CA/40</th>
                  <th className="px-4 py-3 text-center">Exam/60</th>
                  <th className="px-4 py-3 text-center">Total/100</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) =>
                  student.subjects.map((subject, idx) => (
                    <tr
                      key={`${student.student_id}:${subject.subject_id}`}
                      className={`border-b ${subject.isDirty ? 'bg-yellow-50' : ''}`}
                    >
                      {idx === 0 && (
                        <>
                          <td
                            rowSpan={student.subjects.length}
                            className="px-4 py-3 font-semibold text-gray-800 border-r"
                          >
                            {student.student_name}
                          </td>
                          <td
                            rowSpan={student.subjects.length}
                            className="px-4 py-3 text-gray-600 border-r"
                          >
                            {student.admission_number}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-gray-700">{subject.subject_name}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={MAX_SCORES.CA1}
                          value={subject.ca1 ?? ''}
                          onChange={(e) =>
                            updateScore(
                              student.student_id,
                              subject.subject_id,
                              'ca1',
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={MAX_SCORES.CA2}
                          value={subject.ca2 ?? ''}
                          onChange={(e) =>
                            updateScore(
                              student.student_id,
                              subject.subject_id,
                              'ca2',
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={MAX_SCORES.CA3}
                          value={subject.ca3 ?? ''}
                          onChange={(e) =>
                            updateScore(
                              student.student_id,
                              subject.subject_id,
                              'ca3',
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={MAX_SCORES.CA4}
                          value={subject.ca4 ?? ''}
                          onChange={(e) =>
                            updateScore(
                              student.student_id,
                              subject.subject_id,
                              'ca4',
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {subject.caTotal}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={MAX_SCORES.EXAM}
                          value={subject.exam ?? ''}
                          onChange={(e) =>
                            updateScore(
                              student.student_id,
                              subject.subject_id,
                              'exam',
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {subject.total}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-600">
                        {subject.grade}
                      </td>
                      {idx === 0 && (
                        <td
                          rowSpan={student.subjects.length}
                          className="px-4 py-3 text-center border-l"
                        >
                          <button
                            onClick={() => saveStudentScores(student.student_id)}
                            disabled={saving || !student.subjects.some((s) => s.isDirty)}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition"
                          >
                            Save
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loadingStudents && students.length === 0 && selectedTerm && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No students found or no scores to display</p>
          </div>
        )}

        {!loadingStudents && students.length === 0 && !selectedTerm && (
          <div className="bg-blue-50 rounded-lg shadow p-8 text-center border-l-4 border-blue-600">
            <p className="text-blue-700">
              Select a term above to view your class students and enter scores
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
