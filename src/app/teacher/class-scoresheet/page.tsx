'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

interface StudentWithScores {
  student_id: string
  student_name: string
  admission_number: string
  subjects: SubjectScore[]
}

interface SubjectScore {
  subject_id: string
  subject_name: string
  subject_code: string
  test1: number | null
  test2: number | null
  test3: number | null
  test4: number | null
  exam: number | null
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

export default function ClassScoresheetPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [school, setSchool] = useState<any>(null)

  // Filters
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  
  // Data
  const [classData, setClassData] = useState<any>(null)
  const [studentsWithScores, setStudentsWithScores] = useState<StudentWithScores[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedScores, setEditedScores] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadUserAndData()
  }, [])

  useEffect(() => {
    if (selectedTerm && classData) {
      loadClassStudentsWithScores()
    }
  }, [selectedTerm])

  const loadUserAndData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      setSchool(schoolData)

      // Fetch terms
      const termsResponse = await fetch(`/api/teacher/terms?school_id=${currentUser.school_id}`)
      if (termsResponse.ok) {
        const termsData = await termsResponse.json()
        if (termsData.success && termsData.terms) {
          setTerms(termsData.terms)
          const currentTerm = termsData.terms.find((t: any) => t.is_current)
          if (currentTerm) {
            setSelectedTerm(currentTerm.id)
          } else if (termsData.terms.length > 0) {
            setSelectedTerm(termsData.terms[0].id)
          }
        }
      }

      // Fetch teacher's class (assuming one class per teacher)
      const classResponse = await fetch('/api/teacher/classes', {
        headers: {
          'x-teacher-id': currentUser.id,
          'x-school-id': currentUser.school_id,
        },
      })

      if (classResponse.ok) {
        const classesData = await classResponse.json()
        if (classesData.success && classesData.classes && classesData.classes.length > 0) {
          // Use first class (teacher's assigned class)
          setClassData(classesData.classes[0])
        }
      }
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadClassStudentsWithScores = async () => {
    if (!classData || !selectedTerm || !user) return

    try {
      setLoadingData(true)

      // Fetch all students in this class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          admission_number,
          users!inner (id, full_name)
        `)
        .eq('class_arm_combo_id', classData.id)
        .eq('school_id', user.school_id)
        .order('users.full_name', { ascending: true })

      if (studentsError) throw studentsError

      if (!students || students.length === 0) {
        setStudentsWithScores([])
        return
      }

      // For each student, fetch their subjects and scores
      const studentsData = await Promise.all(
        students.map(async (student: any) => {
          // Fetch student's enrolled subjects
          const { data: enrollments } = await supabase
            .from('student_subjects')
            .select(`
              subject_id,
              subjects (id, name, code)
            `)
            .eq('student_id', student.id)
            .eq('school_id', user.school_id)

          if (!enrollments) {
            return {
              student_id: student.id,
              student_name: student.users?.full_name || '',
              admission_number: student.admission_number,
              subjects: [],
            }
          }

          // Fetch scores for each subject in this term
          const subjectsWithScores = await Promise.all(
            enrollments.map(async (enrollment: any) => {
              const { data: scoreData } = await supabase
                .from('score_sheets')
                .select('*')
                .eq('student_id', student.id)
                .eq('subject_id', enrollment.subject_id)
                .eq('term_id', selectedTerm)
                .eq('school_id', user.school_id)
                .maybeSingle()

              return {
                subject_id: enrollment.subject_id,
                subject_name: enrollment.subjects?.name || 'Unknown',
                subject_code: enrollment.subjects?.code || '',
                test1: scoreData?.test1 || null,
                test2: scoreData?.test2 || null,
                test3: scoreData?.test3 || null,
                test4: scoreData?.test4 || null,
                exam: scoreData?.exam || null,
                total: scoreData?.total || 0,
                grade: scoreData?.grade || '-',
              }
            })
          )

          return {
            student_id: student.id,
            student_name: student.users?.full_name || '',
            admission_number: student.admission_number,
            subjects: subjectsWithScores,
          }
        })
      )

      setStudentsWithScores(studentsData)
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoadingData(false)
    }
  }

  const updateScore = (studentId: string, subjectId: string, field: string, value: string) => {
    const key = `${studentId}-${subjectId}`
    const current = editedScores.get(key) || {
      student_id: studentId,
      subject_id: subjectId,
      test1: null,
      test2: null,
      test3: null,
      test4: null,
      exam: null,
    }

    const numValue = value === '' ? null : parseFloat(value)
    
    // Validate ranges
    if (field.startsWith('test') && numValue !== null && (numValue < 0 || numValue > 10)) {
      toast.error(`${field} must be between 0-10`)
      return
    }
    if (field === 'exam' && numValue !== null && (numValue < 0 || numValue > 60)) {
      toast.error('Exam must be between 0-60')
      return
    }

    current[field] = numValue
    setEditedScores(new Map(editedScores.set(key, current)))
  }

  const saveAllScores = async () => {
    if (!user || !selectedTerm || editedScores.size === 0) {
      toast.error('No changes to save')
      return
    }

    setSaving(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const [key, scoreData] of editedScores) {
        try {
          // Check if score exists
          const { data: existing } = await supabase
            .from('score_sheets')
            .select('id')
            .eq('student_id', scoreData.student_id)
            .eq('subject_id', scoreData.subject_id)
            .eq('term_id', selectedTerm)
            .eq('school_id', user.school_id)
            .maybeSingle()

          const payload = {
            school_id: user.school_id,
            student_id: scoreData.student_id,
            subject_id: scoreData.subject_id,
            term_id: selectedTerm,
            test1: scoreData.test1,
            test2: scoreData.test2,
            test3: scoreData.test3,
            test4: scoreData.test4,
            exam: scoreData.exam,
            test1_source: scoreData.test1 !== null ? 'MANUAL' : null,
            test2_source: scoreData.test2 !== null ? 'MANUAL' : null,
            test3_source: scoreData.test3 !== null ? 'MANUAL' : null,
            test4_source: scoreData.test4 !== null ? 'MANUAL' : null,
            exam_source: scoreData.exam !== null ? 'MANUAL' : null,
            updated_at: new Date().toISOString(),
          }

          let result
          if (existing?.id) {
            result = await supabase
              .from('score_sheets')
              .update(payload)
              .eq('id', existing.id)
          } else {
            result = await supabase
              .from('score_sheets')
              .insert({
                ...payload,
                class_arm_combo_id: classData?.id,
                teacher_id: user.id,
                created_at: new Date().toISOString(),
              })
          }

          if (result.error) {
            errorCount++
            console.error(`Error saving score for ${key}:`, result.error)
          } else {
            successCount++
          }
        } catch (error) {
          errorCount++
          console.error(`Error saving ${key}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`✅ ${successCount} scores saved successfully`)
        setEditedScores(new Map())
        loadClassStudentsWithScores()
      }

      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} scores failed to save`)
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const bgClass = darkMode
    ? 'from-slate-950 via-purple-900 to-slate-900'
    : 'from-purple-50 via-pink-50 to-purple-100'
  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border-slate-700/50'
    : 'bg-white/90 backdrop-blur border-purple-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'
  const inputClass = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300'
  const tableHeaderClass = darkMode ? 'bg-gray-700' : 'bg-gray-200'
  const tableRowClass = darkMode ? 'bg-gray-800' : 'bg-white'
  const tableAltRowClass = darkMode ? 'bg-gray-700/50' : 'bg-gray-50'

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className={textClass}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass}`}>
      {/* Header */}
      <div className={`${cardClass} border-b shadow-2xl sticky top-0 z-40`}>
        <div className="max-w-full mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
              📊 Class Score Sheet
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {school?.name} • {classData?.classes?.name} {classData?.arms?.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-6 py-8">
        {/* Term Filter */}
        <div className={`${cardClass} border rounded-lg shadow-xl p-6 mb-6`}>
          <label className={`block text-sm font-semibold ${textClass} mb-2`}>Select Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className={`w-full md:w-64 px-4 py-2 rounded-lg border ${inputClass} focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value="">Choose a term...</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name} {term.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Score Table */}
        {loadingData ? (
          <div className="text-center py-12">
            <p className={textClass}>Loading students and subjects...</p>
          </div>
        ) : studentsWithScores.length === 0 ? (
          <div className={`${cardClass} border rounded-lg shadow-xl p-8 text-center`}>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {selectedTerm ? 'No students in this class' : 'Select a term to view students'}
            </p>
          </div>
        ) : (
          <div className={`${cardClass} border rounded-lg shadow-xl overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white sticky left-0 z-10">Student</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">Admission</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">Subject</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-900 dark:text-white">T1</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-900 dark:text-white">T2</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-900 dark:text-white">T3</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-900 dark:text-white">T4</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-900 dark:text-white">Exam</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-900 dark:text-white">Total</th>
                  <th className="px-3 py-3 text-center font-bold text-gray-900 dark:text-white">Grade</th>
                </tr>
              </thead>
              <tbody>
                {studentsWithScores.map((student, studentIdx) => (
                  <tbody key={student.student_id}>
                    {student.subjects.map((subject, subjectIdx) => {
                      const editKey = `${student.student_id}-${subject.subject_id}`
                      const edited = editedScores.get(editKey)

                      const test1 = edited?.test1 ?? subject.test1
                      const test2 = edited?.test2 ?? subject.test2
                      const test3 = edited?.test3 ?? subject.test3
                      const test4 = edited?.test4 ?? subject.test4
                      const exam = edited?.exam ?? subject.exam

                      const testTotal = (test1 || 0) + (test2 || 0) + (test3 || 0) + (test4 || 0)
                      const total = testTotal + (exam || 0)
                      const grade = calculateGrade(total)

                      const isAlternateRow = (studentIdx + subjectIdx) % 2 === 0

                      return (
                        <tr
                          key={`${student.student_id}-${subject.subject_id}`}
                          className={isAlternateRow ? tableRowClass : tableAltRowClass}
                        >
                          {/* Student Name (shown only on first subject) */}
                          {subjectIdx === 0 && (
                            <td rowSpan={student.subjects.length} className={`px-4 py-3 font-semibold ${textClass} border-r align-top sticky left-0 z-10 ${isAlternateRow ? tableRowClass : tableAltRowClass}`}>
                              {student.student_name}
                            </td>
                          )}

                          {/* Admission Number (shown only on first subject) */}
                          {subjectIdx === 0 && (
                            <td rowSpan={student.subjects.length} className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} border-r align-top ${isAlternateRow ? tableRowClass : tableAltRowClass}`}>
                              {student.admission_number}
                            </td>
                          )}

                          {/* Subject */}
                          <td className={`px-4 py-3 font-medium ${textClass}`}>
                            <div>
                              <p>{subject.subject_name}</p>
                              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ({subject.subject_code})
                              </p>
                            </div>
                          </td>

                          {/* Test 1 */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={test1 ?? ''}
                              onChange={(e) =>
                                updateScore(student.student_id, subject.subject_id, 'test1', e.target.value)
                              }
                              className={`w-12 px-2 py-1 border rounded text-center text-sm ${inputClass} focus:outline-none focus:ring-1 focus:ring-purple-500`}
                              placeholder="-"
                            />
                          </td>

                          {/* Test 2 */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={test2 ?? ''}
                              onChange={(e) =>
                                updateScore(student.student_id, subject.subject_id, 'test2', e.target.value)
                              }
                              className={`w-12 px-2 py-1 border rounded text-center text-sm ${inputClass} focus:outline-none focus:ring-1 focus:ring-purple-500`}
                              placeholder="-"
                            />
                          </td>

                          {/* Test 3 */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={test3 ?? ''}
                              onChange={(e) =>
                                updateScore(student.student_id, subject.subject_id, 'test3', e.target.value)
                              }
                              className={`w-12 px-2 py-1 border rounded text-center text-sm ${inputClass} focus:outline-none focus:ring-1 focus:ring-purple-500`}
                              placeholder="-"
                            />
                          </td>

                          {/* Test 4 */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={test4 ?? ''}
                              onChange={(e) =>
                                updateScore(student.student_id, subject.subject_id, 'test4', e.target.value)
                              }
                              className={`w-12 px-2 py-1 border rounded text-center text-sm ${inputClass} focus:outline-none focus:ring-1 focus:ring-purple-500`}
                              placeholder="-"
                            />
                          </td>

                          {/* Exam */}
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="60"
                              step="0.5"
                              value={exam ?? ''}
                              onChange={(e) =>
                                updateScore(student.student_id, subject.subject_id, 'exam', e.target.value)
                              }
                              className={`w-12 px-2 py-1 border rounded text-center text-sm ${inputClass} focus:outline-none focus:ring-1 focus:ring-purple-500`}
                              placeholder="-"
                            />
                          </td>

                          {/* Total */}
                          <td className={`px-3 py-3 text-center font-bold text-lg ${darkMode ? 'bg-gray-600' : 'bg-green-100'}`}>
                            {total.toFixed(1)}/100
                          </td>

                          {/* Grade */}
                          <td className={`px-3 py-3 text-center font-bold rounded ${
                            grade === 'A'
                              ? 'bg-green-200 text-green-800'
                              : grade === 'B'
                              ? 'bg-blue-200 text-blue-800'
                              : grade === 'C'
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {grade}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                ))}
              </tbody>
            </table>

            {/* Save Button */}
            <div className={`border-t p-6 flex justify-end gap-3`}>
              <p className={`mr-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {editedScores.size > 0 ? `${editedScores.size} changes pending` : 'No unsaved changes'}
              </p>
              <button
                onClick={saveAllScores}
                disabled={saving || editedScores.size === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50"
              >
                {saving ? '💾 Saving...' : `✅ Save ${editedScores.size > 0 ? `(${editedScores.size})` : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
