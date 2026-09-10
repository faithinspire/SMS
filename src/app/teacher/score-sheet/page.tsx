'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { TeacherContextService } from '@/services/teacher-context.service'
import TeacherDataService, { ClassStudentData, SubjectStudentData, TermInfo } from '@/services/teacher-data.service'
import { User, School } from '@/types'

interface StudentScore {
  id: string
  studentId: string
  name: string
  admissionNumber: string
  test1: number | null
  test2: number | null
  test3: number | null
  test4: number | null
  exam: number | null
  test1Source?: string
  test2Source?: string
  test3Source?: string
  test4Source?: string
  examSource?: string
  total: number
  grade: string
}

const GRADING_SCALE = [
  { min: 70, max: 100, grade: 'A' },
  { min: 60, max: 69, grade: 'B' },
  { min: 50, max: 59, grade: 'C' },
  { min: 40, max: 49, grade: 'D' },
  { min: 0, max: 39, grade: 'F' },
]

const calculateGrade = (score: number): string => {
  for (const range of GRADING_SCALE) {
    if (score >= range.min && score <= range.max) {
      return range.grade
    }
  }
  return 'F'
}

const calculateTotal = (test1: number | null, test2: number | null, test3: number | null, test4: number | null, exam: number | null): number => {
  return (test1 || 0) + (test2 || 0) + (test3 || 0) + (test4 || 0) + (exam || 0)
}

export default function ScoreSheetPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [terms, setTerms] = useState<TermInfo[]>([])

  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')

  // Data
  const [students, setStudents] = useState<StudentScore[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Load user and initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('[ScoreSheet] Initializing...')

        const currentUser = await AuthService.getCurrentUser()
        if (!currentUser || currentUser.role !== 'TEACHER') {
          console.error('[ScoreSheet] User not authenticated or not a teacher')
          router.push('/auth/teacher/login')
          return
        }

        setUser(currentUser)
        console.log('[ScoreSheet] User authenticated:', currentUser.id)

        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        setSchool(schoolData)
        console.log('[ScoreSheet] School loaded:', schoolData?.name)

        // Get teacher context
        const context = await TeacherContextService.getCurrentTeacherContext()
        console.log('[ScoreSheet] Teacher context loaded:', context)

        // Format classes and subjects
        const classesFormatted = context.managedClasses.map((cls) => ({
          id: cls.id,
          name: `${cls.name} - ${cls.armName}`,
        }))

        const subjectsFormatted = context.taughtSubjects.map((subj) => ({
          id: subj.subject_id,
          name: subj.name,
        }))

        setClasses(classesFormatted)
        setSubjects(subjectsFormatted)
        console.log(`[ScoreSheet] Classes: ${classesFormatted.length}, Subjects: ${subjectsFormatted.length}`)

        // Get terms - DIRECT QUERY without is_active filter
        console.log('[ScoreSheet] Fetching terms...')
        const fetchedTerms = await TeacherDataService.getTerms(currentUser.school_id)
        console.log('[ScoreSheet] Fetched terms:', fetchedTerms.length, fetchedTerms)
        setTerms(fetchedTerms)

        if (fetchedTerms.length === 0) {
          console.warn('[ScoreSheet] ⚠️ NO TERMS FOUND - Please create academic terms in settings')
          setError('❌ No academic terms found. Please contact administrator to create terms.')
        } else {
          console.log(`[ScoreSheet] ✅ Successfully loaded ${fetchedTerms.length} terms`)
        }

        if (classesFormatted.length > 0) {
          setSelectedClass(classesFormatted[0].id)
        }

        if (subjectsFormatted.length > 0) {
          setSelectedSubject(subjectsFormatted[0].id)
        }
      } catch (err) {
        console.error('[ScoreSheet] Error initializing:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize')
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [router])

  // Load students when class/subject/term changes
  useEffect(() => {
    const loadStudents = async () => {
      if (!user || !selectedClass || !selectedSubject || !selectedTerm) {
        console.log('[ScoreSheet] Missing filter selections, clearing students')
        setStudents([])
        setLoadingStudents(false)
        return
      }

      let retries = 3
      let lastError: Error | null = null

      while (retries > 0) {
        try {
          setLoadingStudents(true)
          setError(null)
          console.log(`[ScoreSheet] Loading students for term: ${selectedTerm} (Attempt ${4 - retries}/3)`)

          // Get students for this subject with explicit error handling
          let subjectStudents: any[] = []
          try {
            subjectStudents = await TeacherDataService.getSubjectStudents(
              user.school_id,
              selectedSubject
            )
          } catch (serviceErr) {
            console.error('[ScoreSheet] Service error:', serviceErr)
            lastError = serviceErr as Error
            
            // Check if it's a network error - retry if so
            if (serviceErr instanceof Error && (serviceErr.message.includes('Failed to fetch') || serviceErr.message.includes('query failed'))) {
              console.warn(`[ScoreSheet] Network/Service error, retrying... (${retries - 1} retries left)`)
              retries--
              if (retries > 0) {
                // Wait 1 second before retrying
                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
              }
            }
            throw serviceErr
          }
          
          console.log(`[ScoreSheet] Got ${subjectStudents.length} subject students`)

          // Get existing score sheet data for this term
          const { data: scoreData, error: scoreError } = await supabase
            .from('score_sheets')
            .select('student_id, test1, test2, test3, test4, exam, grade, test1_source, test2_source, test3_source, test4_source, exam_source')
            .eq('subject_id', selectedSubject)
            .eq('term_id', selectedTerm)
            .eq('school_id', user.school_id)

          if (scoreError) {
            console.warn('[ScoreSheet] Error fetching scores:', scoreError)
          } else {
            console.log(`[ScoreSheet] Found ${scoreData?.length || 0} existing scores`)
          }

          const scoreMap = new Map<string, any>()
          ;(scoreData || []).forEach((score: any) => {
            scoreMap.set(score.student_id, score)
          })

          // Build student scores array
          const studentsWithScores: StudentScore[] = subjectStudents.map((student: SubjectStudentData) => {
            const existingScore = scoreMap.get(student.id)
            const test1 = existingScore?.test1 || null
            const test2 = existingScore?.test2 || null
            const test3 = existingScore?.test3 || null
            const test4 = existingScore?.test4 || null
            const exam = existingScore?.exam || null
            const total = calculateTotal(test1, test2, test3, test4, exam)
            const grade = calculateGrade(total)

            return {
              id: student.id,
              studentId: student.id,
              name: student.name,
              admissionNumber: student.admissionNumber,
              test1,
              test2,
              test3,
              test4,
              exam,
              test1Source: existingScore?.test1_source,
              test2Source: existingScore?.test2_source,
              test3Source: existingScore?.test3_source,
              test4Source: existingScore?.test4_source,
              examSource: existingScore?.exam_source,
              total,
              grade,
            }
          })

          setStudents(studentsWithScores)
          setLoadingStudents(false)
          console.log(`[ScoreSheet] ✅ Successfully loaded ${studentsWithScores.length} students with scores`)
          return // Success - exit retry loop
        } catch (err) {
          console.error('[ScoreSheet] Error loading students:', err)
          lastError = err as Error
          retries--
          if (retries === 0) {
            // All retries exhausted
            setError(err instanceof Error ? err.message : 'Failed to load students')
            setStudents([])
            setLoadingStudents(false)
          } else {
            console.warn(`[ScoreSheet] Retrying... (${retries} retries left)`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }
    }

    loadStudents()
  }, [user, selectedClass, selectedSubject, selectedTerm])

  const updateScore = (studentId: string, field: keyof Pick<StudentScore, 'test1' | 'test2' | 'test3' | 'test4' | 'exam'>, value: number | null) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.studentId !== studentId) return student

        const updated = { ...student, [field]: value }
        updated.total = calculateTotal(updated.test1, updated.test2, updated.test3, updated.test4, updated.exam)
        updated.grade = calculateGrade(updated.total)

        return updated
      })
    )
  }

  const handleSaveScores = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage('')

      if (!selectedSubject || !selectedTerm || !user || !school) {
        setError('❌ Missing required selections')
        console.error('[ScoreSheet] Missing selections:', { selectedSubject, selectedTerm, user: !!user, school: !!school })
        return
      }

      console.log(`[ScoreSheet] Saving ${students.length} scores for term ${selectedTerm}`)

      // Prepare records for upsert - preserve CBT source information
      const records = students.map((student) => ({
        school_id: user.school_id,
        student_id: student.studentId,
        subject_id: selectedSubject,
        term_id: selectedTerm,
        test1: student.test1 !== null ? parseFloat(student.test1.toString()) : null,
        test2: student.test2 !== null ? parseFloat(student.test2.toString()) : null,
        test3: student.test3 !== null ? parseFloat(student.test3.toString()) : null,
        test4: student.test4 !== null ? parseFloat(student.test4.toString()) : null,
        exam: student.exam !== null ? parseFloat(student.exam.toString()) : null,
        grade: student.grade || '',
        // IMPORTANT: Don't overwrite CBT sources - only update if manually edited
      }))

      console.log('[ScoreSheet] Records to save:', records)

      // Use upsert with onConflict matching the table's unique constraint
      const { error: upsertError, data: upsertData } = await supabase
        .from('score_sheets')
        .upsert(records, { onConflict: 'school_id,student_id,subject_id,term_id' })
        .select()

      if (upsertError) {
        console.error('[ScoreSheet] ❌ Upsert error:', upsertError)
        throw new Error(`Save failed: ${upsertError.message}`)
      }

      console.log('[ScoreSheet] ✅ Successfully saved scores:', upsertData)
      setSuccessMessage(`✅ Saved ${students.length} scores successfully!`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('[ScoreSheet] ❌ Error saving:', err)
      setError(err instanceof Error ? err.message : 'Error saving scores')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading score sheet...</p>
        </div>
      </div>
    )
  }

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Error loading data</p>
          <button
            onClick={() => router.push('/auth/teacher/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Score Sheet</h1>
              <p className="text-gray-600 mt-1">Enter and manage student scores</p>
              <p className="text-sm text-gray-500 mt-2">{school.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Teacher: {user.full_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select subject</option>
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                    {subj.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term {terms.length > 0 && `(${terms.length} available)`}
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select term</option>
                {terms.length === 0 ? (
                  <option disabled>No terms available</option>
                ) : (
                  terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({term.sessionYear})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Score Table */}
        {loadingStudents ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading students...</p>
          </div>
        ) : students.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission #</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Test 1</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Test 2</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Test 3</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Test 4</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Exam</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.admissionNumber}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={student.test1 ?? ''}
                            onChange={(e) => updateScore(student.studentId, 'test1', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          {student.test1Source && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded text-center ${
                              student.test1Source === 'CBT' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {student.test1Source}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={student.test2 ?? ''}
                            onChange={(e) => updateScore(student.studentId, 'test2', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          {student.test2Source && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded text-center ${
                              student.test2Source === 'CBT' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {student.test2Source}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={student.test3 ?? ''}
                            onChange={(e) => updateScore(student.studentId, 'test3', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          {student.test3Source && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded text-center ${
                              student.test3Source === 'CBT' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {student.test3Source}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={student.test4 ?? ''}
                            onChange={(e) => updateScore(student.studentId, 'test4', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          {student.test4Source && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded text-center ${
                              student.test4Source === 'CBT' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {student.test4Source}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={student.exam ?? ''}
                            onChange={(e) => updateScore(student.studentId, 'exam', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          {student.examSource && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded text-center ${
                              student.examSource === 'CBT' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {student.examSource}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">{student.total}</td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">{student.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save Button */}
            <div className="border-t border-gray-200 p-6 flex justify-end gap-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSaveScores}
                disabled={saving || students.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : `Save ${students.length} Scores`}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">
              {selectedClass && selectedSubject && selectedTerm ? 'No students found' : 'Select class, subject, and term'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
