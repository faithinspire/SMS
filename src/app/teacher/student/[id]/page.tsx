'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

interface StudentScore {
  id: string
  student_id: string
  subject_id: string
  term_id: string
  test1?: number
  test2?: number
  test3?: number
  test4?: number
  exam?: number
  total?: number
  grade?: string
  subject_name?: string
  term_name?: string
  updated_at?: string
}

interface StudentInfo {
  id: string
  user_id: string
  admission_number: string
  full_name?: string
  photo_url?: string
  class_name?: string
  arm_name?: string
  email?: string
  phone?: string
}

interface PageState {
  loading: boolean
  error: string | null
  student: StudentInfo | null
  scores: StudentScore[]
}

const initialState: PageState = {
  loading: true,
  error: null,
  student: null,
  scores: [],
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = (params?.id as string) || ''

  const [state, setState] = useState<PageState>(initialState)

  useEffect(() => {
    if (!studentId) return

    let cancelled = false

    const loadStudentData = async () => {
      try {
        // Verify auth
        const currentUser = await AuthService.getCurrentUser()
        if (cancelled) return

        if (!currentUser || currentUser.role !== 'TEACHER') {
          router.push('/landing')
          return
        }

        if (!currentUser.school_id) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'School information not found',
          }))
          return
        }

        // Load student info
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(
            `
            id,
            user_id,
            admission_number,
            users:user_id (
              id,
              full_name,
              email,
              phone,
              photo_url
            ),
            class_arm_combos (
              classes (name),
              arms (name)
            )
          `
          )
          .eq('id', studentId)
          .eq('school_id', currentUser.school_id)
          .single()

        if (cancelled) return

        if (studentError) {
          throw new Error(`Failed to load student: ${studentError.message}`)
        }

        if (!studentData) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Student not found',
          }))
          return
        }

        const formattedStudent: StudentInfo = {
          id: studentData.id,
          user_id: studentData.user_id,
          admission_number: studentData.admission_number,
          full_name: studentData.users?.full_name || 'Unknown',
          email: studentData.users?.email,
          phone: studentData.users?.phone,
          photo_url: studentData.users?.photo_url,
          class_name: studentData.class_arm_combos?.classes?.name,
          arm_name: studentData.class_arm_combos?.arms?.name,
        }

        // Load scores
        const { data: scoreData, error: scoreError } = await supabase
          .from('score_sheets')
          .select(
            `
            id,
            student_id,
            subject_id,
            term_id,
            test1,
            test2,
            test3,
            test4,
            exam,
            grade,
            total,
            updated_at,
            subjects (name),
            academic_terms (term_name)
          `
          )
          .eq('student_id', studentId)
          .eq('school_id', currentUser.school_id)
          .order('updated_at', { ascending: false })

        if (cancelled) return

        if (scoreError) {
          throw new Error(`Failed to load scores: ${scoreError.message}`)
        }

        const formattedScores: StudentScore[] = (scoreData || []).map(
          (score: any) => ({
            id: score.id,
            student_id: score.student_id,
            subject_id: score.subject_id,
            term_id: score.term_id,
            test1: score.test1,
            test2: score.test2,
            test3: score.test3,
            test4: score.test4,
            exam: score.exam,
            total: score.total,
            grade: score.grade,
            subject_name: score.subjects?.name,
            term_name: score.academic_terms?.term_name,
            updated_at: score.updated_at,
          })
        )

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            student: formattedStudent,
            scores: formattedScores,
          })
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading student data:', error)
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'An error occurred',
          }))
        }
      }
    }

    loadStudentData()

    return () => {
      cancelled = true
    }
  }, [studentId, router])

  const getGradeColor = (grade?: string): string => {
    switch (grade) {
      case 'A':
        return 'bg-green-500'
      case 'B':
        return 'bg-blue-500'
      case 'C':
        return 'bg-yellow-500'
      case 'D':
        return 'bg-orange-500'
      case 'F':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Student Information...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{state.error}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-semibold"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!state.student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-orange-500 text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Student Not Found
            </h2>
            <p className="text-gray-600 mb-6">Could not load student information.</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-semibold"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { student, scores } = state

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-50 to-blue-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-blue-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-bold truncate">
                👨‍🎓 {student.full_name}
              </h1>
              <p className="text-xs sm:text-sm text-orange-100 mt-1">
                Admission: {student.admission_number}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-3 sm:px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition font-semibold text-sm sm:text-base flex-shrink-0"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Student Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Email</h3>
            <p className="text-lg font-bold text-gray-900 break-all">
              {student.email || 'N/A'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Phone</h3>
            <p className="text-lg font-bold text-gray-900">
              {student.phone || 'N/A'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Class</h3>
            <p className="text-lg font-bold text-gray-900">
              {student.class_name} {student.arm_name ? `- ${student.arm_name}` : ''}
            </p>
          </div>
        </div>

        {/* Scores Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-100 to-blue-100 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              📊 Academic Scores
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Total Subjects: {scores.length}
            </p>
          </div>

          {scores.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No scores recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Subject
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      T1
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      T2
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      T3
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      T4
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      Exam
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      Total
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, idx) => (
                    <tr
                      key={score.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-gray-900">
                        {score.subject_name || 'Unknown'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center text-sm text-gray-700">
                        {score.test1 !== null && score.test1 !== undefined
                          ? score.test1.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center text-sm text-gray-700">
                        {score.test2 !== null && score.test2 !== undefined
                          ? score.test2.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center text-sm text-gray-700">
                        {score.test3 !== null && score.test3 !== undefined
                          ? score.test3.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center text-sm text-gray-700">
                        {score.test4 !== null && score.test4 !== undefined
                          ? score.test4.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center text-sm text-gray-700">
                        {score.exam !== null && score.exam !== undefined
                          ? score.exam.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center text-sm font-bold text-gray-900">
                        {score.total !== null && score.total !== undefined
                          ? score.total.toFixed(2)
                          : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-white font-bold text-sm ${getGradeColor(
                            score.grade
                          )}`}
                        >
                          {score.grade || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
