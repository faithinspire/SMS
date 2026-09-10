'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { AcademicSessionService } from '@/services/academic-session.service'
import { supabase } from '@/lib/supabase-client'
import { calculateGrade } from '@/utils/grading'
import { calculateScores, validateScores, MAX_SCORES } from '@/utils/scoring'
import toast from 'react-hot-toast'

interface StudentWithScore {
  student_id: string
  admission_number: string
  student_name: string
  class_name: string
  user_id: string
  ca1: number | null
  ca2: number | null
  ca3: number | null
  ca4: number | null
  exam: number | null
  caTotal: number
  total: number
  grade: string
  isDirty: boolean
  score_id?: string
}

interface AcademicSession {
  id: string
  session_year: string
}

interface Term {
  id: string
  term_name: string
}

interface Subject {
  id: string
  name: string
}

interface ClassAssignment {
  class_arm_combo_id: string
  class_name: string
}

export default function SubjectScoreSheetPage() {
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

  // Subject & Class Selection
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')

  // Student & Score Data
  const [students, setStudents] = useState<StudentWithScore[]>([])
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
      loadSubjects()
      loadClassAssignments()
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

  // Load students when subject, class, and term are selected
  useEffect(() => {
    if (selectedSubject && selectedClass && selectedTerm) {
      loadSubjectStudents()
    } else {
      setStudents([])
    }
  }, [selectedSubject, selectedClass, selectedTerm])

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

      // Only subject teachers can access this page
      if (currentUser.role !== 'SUBJECT_TEACHER') {
        toast.error('Only Subject Teachers can access this page')
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
      console.error('[SubjectScoreSheet] Init error:', err)
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
      console.error('[SubjectScoreSheet] Load sessions error:', err)
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
      console.error('[SubjectScoreSheet] Load terms error:', err)
      toast.error('Failed to load terms')
    }
  }

  /**
   * Load teacher's assigned subjects
   */
  const loadSubjects = async () => {
    try {
      if (!user?.id || !user?.school_id) return

      const { data: assignments } = await supabase
        .from('subject_teacher_assignments')
        .select('subject_id, subjects(name)')
        .eq('teacher_id', user.id)
        .eq('school_id', user.school_id)

      if (!assignments || assignments.length === 0) {
        setError('You are not assigned to teach any subjects')
        toast.error('No subject assignments found')
        setSubjects([])
        return
      }

      // Get unique subjects
      const uniqueSubjects = Array.from(
        new Map(
          assignments.map((a: any) => [a.subject_id, { id: a.subject_id, name: (a.subjects as any)?.name }])
        ).values()
      )

      setSubjects(uniqueSubjects as Subject[])

      // Auto-select first subject
      if (uniqueSubjects.length > 0) {
        setSelectedSubject(uniqueSubjects[0].id)
      }
    } catch (err) {
      console.error('[SubjectScoreSheet] Load subjects error:', err)
      toast.error('Failed to load subjects')
    }
  }

  /**
   * Load classes where teacher teaches selected subject
   */
  const loadClassAssignments = useCallback(async () => {
    try {
      if (!user?.id || !user?.school_id || !selectedSubject) {
        setClassAssignments([])
        return
      }

      const { data: assignments } = await supabase
        .from('subject_teacher_assignments')
        .select('class_arm_combo_id, class_arm_combos(classes(name), arms(name))')
        .eq('teacher_id', user.id)
        .eq('subject_id', selectedSubject)
        .eq('school_id', user.school_id)

      if (!assignments || assignments.length === 0) {
        setError('You are not assigned to teach this subject to any class')
        toast.error('No class assignments found for this subject')
        setClassAssignments([])
        setSelectedClass('')
        return
      }

      const classData = assignments.map((a: any) => ({
        class_arm_combo_id: a.class_arm_combo_id,
        class_name: `${(a.class_arm_combos?.classes as any)?.name || ''} ${(a.class_arm_combos?.arms as any)?.name || ''}`.trim(),
      }))

      setClassAssignments(classData)

      // Auto-select first class
      if (classData.length > 0) {
        setSelectedClass(classData[0].class_arm_combo_id)
      }
    } catch (err) {
      console.error('[SubjectScoreSheet] Load class assignments error:', err)
      toast.error('Failed to load class assignments')
    }
  }, [user?.id, user?.school_id, selectedSubject])

  // Call loadClassAssignments when subject or dependencies change
  useEffect(() => {
    loadClassAssignments()
  }, [loadClassAssignments])

  /**
   * Load students offering this subject in the selected class
   */
  const loadSubjectStudents = useCallback(async () => {
    try {
      if (!user?.id || !selectedTerm || !user?.school_id || !selectedSubject || !selectedClass) {
        setStudents([])
        return
      }

      setLoadingStudents(true)
      setError(null)

      // Step 1: Get students in this class who are enrolled in this subject
      const { data: studentEnrollments, error: enrollError } = await supabase
        .from('student_subjects')
        .select('student_id, students(admission_number, user_id, users(full_name), class_arm_combos(classes(name), arms(name)))')
        .eq('subject_id', selectedSubject)
        .eq('school_id', user.school_id)

      console.log('[SubjectSheet] Student enrollments query error:', enrollError)
      console.log('[SubjectSheet] Found enrollments:', studentEnrollments?.length || 0)

      if (!studentEnrollments || studentEnrollments.length === 0) {
        // Fallback: Try without school_id
        console.log('[SubjectSheet] No enrollments with school_id, trying without...')
        const { data: enrollments2 } = await supabase
          .from('student_subjects')
          .select('student_id, students(admission_number, user_id, users(full_name), class_arm_combos(classes(name), arms(name)))')
          .eq('subject_id', selectedSubject)

        console.log('[SubjectSheet] Found enrollments without school filter:', enrollments2?.length || 0)

        if (!enrollments2 || enrollments2.length === 0) {
          setStudents([])
          toast.info('No students enrolled in this subject')
          return
        }

        if (enrollments2 && enrollments2.length > 0) {
          // Process with fallback data
          const studentsInClass = enrollments2.filter((enrollment: any) => {
            const studentClassId = (enrollment.students as any)?.class_arm_combos?.id
            return studentClassId === selectedClass
          })

          if (studentsInClass.length === 0) {
            setStudents([])
            toast.info('No students in this class are enrolled in this subject')
            return
          }

          const studentIds = studentsInClass.map((s: any) => s.student_id)

          // Get scores
          const { data: existingScores } = await supabase
            .from('score_sheets')
            .select('id, student_id, test1, test2, test3, test4, exam')
            .in('student_id', studentIds)
            .eq('subject_id', selectedSubject)
            .eq('term_id', selectedTerm)

          const scoreMap = new Map<string, any>()
          existingScores?.forEach((score: any) => {
            scoreMap.set(score.student_id, score)
          })

          const studentsData: StudentWithScore[] = studentsInClass.map((enrollment: any) => {
            const student = enrollment.students as any
            const existingScore = scoreMap.get(enrollment.student_id)

            const scores = calculateScores({
              ca1: existingScore?.test1,
              ca2: existingScore?.test2,
              ca3: existingScore?.test3,
              ca4: existingScore?.test4,
              exam: existingScore?.exam,
            })

            return {
              student_id: enrollment.student_id,
              student_name: student?.users?.full_name || 'Unknown',
              admission_number: student?.admission_number || '',
              class_name: `${student?.class_arm_combos?.classes?.name} ${student?.class_arm_combos?.arms?.name}`.trim(),
              ...scores,
              has_scores: !!existingScore,
            }
          })

          setStudents(studentsData)
          return
        }
      }

      // Filter to only students in selected class
      const studentsInClass = studentEnrollments.filter((enrollment: any) => {
        const studentClassId = (enrollment.students as any)?.class_arm_combos?.id
        return studentClassId === selectedClass
      })

      if (studentsInClass.length === 0) {
        setStudents([])
        toast.info('No students in this class are enrolled in this subject')
        return
      }

      const studentIds = studentsInClass.map((s: any) => s.student_id)

      // Step 2: Get existing scores for these students
      const { data: existingScores } = await supabase
        .from('score_sheets')
        .select('id, student_id, test1, test2, test3, test4, exam')
        .in('student_id', studentIds)
        .eq('subject_id', selectedSubject)
        .eq('term_id', selectedTerm)
        .eq('school_id', user.school_id)

      // Build score map
      const scoreMap = new Map<string, any>()
      existingScores?.forEach((score: any) => {
        scoreMap.set(score.student_id, score)
      })

      // Step 3: Build student rows
      const studentsData: StudentWithScore[] = studentsInClass.map((enrollment: any) => {
        const student = enrollment.students as any
        const existingScore = scoreMap.get(enrollment.student_id)

        const scores = calculateScores({
          ca1: existingScore?.test1,
          ca2: existingScore?.test2,
          ca3: existingScore?.test3,
          ca4: existingScore?.test4,
          exam: existingScore?.exam,
        })

        const gradeInfo = calculateGrade(scores.total)

        return {
          student_id: enrollment.student_id,
          admission_number: student.admission_number,
          student_name: (student.users as any)?.full_name || 'Unknown',
          class_name: `${(student.class_arm_combos?.classes as any)?.name || ''} ${(student.class_arm_combos?.arms as any)?.name || ''}`.trim(),
          user_id: student.user_id,
          ca1: existingScore?.test1 || null,
          ca2: existingScore?.test2 || null,
          ca3: existingScore?.test3 || null,
          ca4: existingScore?.test4 || null,
          exam: existingScore?.exam || null,
          caTotal: scores.caTotal,
          total: scores.total,
          grade: gradeInfo.grade,
          isDirty: false,
          score_id: existingScore?.id,
        }
      })

      // Sort by student name
      studentsData.sort((a, b) => a.student_name.localeCompare(b.student_name))

      setStudents(studentsData)
      setHasUnsavedChanges(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load students'
      setError(message)
      console.error('[SubjectScoreSheet] Load students error:', err)
      toast.error(message)
    } finally {
      setLoadingStudents(false)
    }
  }, [user?.id, selectedTerm, user?.school_id, selectedSubject, selectedClass])

  /**
   * Update a score value
   */
  const updateScore = (
    studentId: string,
    field: 'ca1' | 'ca2' | 'ca3' | 'ca4' | 'exam',
    value: number | null
  ) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => {
        if (student.student_id !== studentId) return student

        // Create updated student object
        const updated = { ...student, [field]: value, isDirty: true }

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
      })
    )

    setHasUnsavedChanges(true)
  }

  /**
   * Save scores for a single student
   */
  const saveStudentScore = async (studentId: string) => {
    try {
      setSaving(true)
      setError(null)

      const student = students.find((s) => s.student_id === studentId)
      if (!student) {
        toast.error('Student not found')
        return
      }

      if (!student.isDirty) {
        toast.info('No changes to save')
        return
      }

      // Validate scores
      const validation = validateScores({
        ca1: student.ca1,
        ca2: student.ca2,
        ca3: student.ca3,
        ca4: student.ca4,
        exam: student.exam,
      })

      if (!validation.isValid) {
        toast.error(`Validation error: ${validation.errors[0]}`)
        return
      }

      // Save via API
      const response = await fetch('/api/subject-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user.school_id,
          student_id: studentId,
          subject_id: selectedSubject,
          term_id: selectedTerm,
          test1: student.ca1,
          test2: student.ca2,
          test3: student.ca3,
          test4: student.ca4,
          exam: student.exam,
          source: 'MANUAL', // Subject teacher entry
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to save score: ${response.statusText}`)
      }

      // Mark as clean
      setStudents((prevStudents) =>
        prevStudents.map((s) => {
          if (s.student_id !== studentId) return s
          return { ...s, isDirty: false }
        })
      )

      toast.success(`Score saved for ${student.student_name}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save score'
      setError(message)
      console.error('[SubjectScoreSheet] Save error:', err)
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

      const dirtyStudents = students.filter((s) => s.isDirty)

      if (dirtyStudents.length === 0) {
        toast.info('No changes to save')
        return
      }

      // Save each student
      for (const student of dirtyStudents) {
        await saveStudentScore(student.student_id)
      }

      setHasUnsavedChanges(false)
      toast.success('All scores saved successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save all scores'
      console.error('[SubjectScoreSheet] Save all error:', err)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const selectedSubjectName = subjects.find((s) => s.id === selectedSubject)?.name || ''
  const selectedClassName =
    classAssignments.find((c) => c.class_arm_combo_id === selectedClass)?.class_name || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Subject Score Sheet</h1>
          {school && (
            <p className="text-gray-600 mb-4">
              <strong>{school.name}</strong> | Subject Teacher: <strong>{user.full_name}</strong>
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Session Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                disabled={sessions.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select...</option>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.term_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={subjects.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select...</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={classAssignments.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select...</option>
                {classAssignments.map((classData) => (
                  <option key={classData.class_arm_combo_id} value={classData.class_arm_combo_id}>
                    {classData.class_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info Bar */}
          {selectedSubjectName && selectedClassName && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-700 font-semibold">
                {selectedSubjectName} • {selectedClassName}
              </p>
            </div>
          )}

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Loading students and scores...</p>
          </div>
        )}

        {/* Students Score Table */}
        {!loadingStudents && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Admission #</th>
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
                {students.map((student) => (
                  <tr
                    key={student.student_id}
                    className={`border-b ${student.isDirty ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800">{student.student_name}</td>
                    <td className="px-4 py-3 text-gray-600">{student.admission_number}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={MAX_SCORES.CA1}
                        value={student.ca1 ?? ''}
                        onChange={(e) =>
                          updateScore(
                            student.student_id,
                            'ca1',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={MAX_SCORES.CA2}
                        value={student.ca2 ?? ''}
                        onChange={(e) =>
                          updateScore(
                            student.student_id,
                            'ca2',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={MAX_SCORES.CA3}
                        value={student.ca3 ?? ''}
                        onChange={(e) =>
                          updateScore(
                            student.student_id,
                            'ca3',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={MAX_SCORES.CA4}
                        value={student.ca4 ?? ''}
                        onChange={(e) =>
                          updateScore(
                            student.student_id,
                            'ca4',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">
                      {student.caTotal}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={MAX_SCORES.EXAM}
                        value={student.exam ?? ''}
                        onChange={(e) =>
                          updateScore(
                            student.student_id,
                            'exam',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">
                      {student.total}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">{student.grade}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => saveStudentScore(student.student_id)}
                        disabled={saving || !student.isDirty}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loadingStudents && students.length === 0 && selectedTerm && selectedSubject && selectedClass && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No students found for this subject in this class</p>
          </div>
        )}

        {!loadingStudents && students.length === 0 && (!selectedTerm || !selectedSubject || !selectedClass) && (
          <div className="bg-blue-50 rounded-lg shadow p-8 text-center border-l-4 border-blue-600">
            <p className="text-blue-700">
              Select Session, Term, Subject and Class above to view students
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
