'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CBTService } from '@/services/cbt.service'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase-client'

interface Exam {
  id: string
  title: string
  description?: string
  examType: 'TEST' | 'EXAM'
  testNumber?: number
  startTime: string
  endTime: string
  durationMinutes: number
  totalMarks?: number
  passingPercentage?: number
  questionCount?: number
  createdAt: string
}

interface ExamWithSubmission extends Exam {
  attempted: boolean
  score?: number
  submittedAt?: string
  status: 'upcoming' | 'active' | 'completed' | 'attempted'
}

export default function StudentCBTPage() {
  const router = useRouter()
  const { user, school } = useAuth()

  const [exams, setExams] = useState<ExamWithSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!user || user.role !== 'STUDENT' || !school) {
      router.push('/landing')
      return
    }

    loadStudentData()
  }, [user, school])

  const loadStudentData = async () => {
    try {
      if (!user || !school) return

      // Get student record
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .eq('school_id', school.id)
        .single()

      if (studentError || !students) {
        throw new Error('Student record not found')
      }

      const sid = students.id
      setStudentId(sid)

      await loadExams(sid)
      setLoading(false)
    } catch (err) {
      console.error('Error loading student data:', err)
      setError('Failed to load exams')
      setLoading(false)
    }
  }

  const loadExams = async (studentId: string) => {
    try {
      if (!school) return

      // Get all exams for student
      const examsData = await CBTService.getExamsForStudent(studentId, school.id)

      // Check submission status for each exam
      const withStatus = await Promise.all(
        (examsData as any[]).map(async exam => {
          const { data: submission } = await supabase
            .from('cbt_submissions')
            .select('id, submitted_at, score')
            .eq('cbt_exam_id', exam.id)
            .eq('student_id', studentId)
            .single()

          const now = new Date()
          const start = new Date(exam.startTime)
          const end = new Date(exam.endTime)

          let status: 'upcoming' | 'active' | 'completed' | 'attempted'
          if (submission?.submitted_at) {
            status = 'attempted'
          } else if (now >= start && now <= end) {
            status = 'active'
          } else if (now < start) {
            status = 'upcoming'
          } else {
            status = 'completed'
          }

          return {
            ...exam,
            attempted: !!submission?.submitted_at,
            score: submission?.score,
            submittedAt: submission?.submitted_at,
            status,
          }
        })
      )

      setExams(withStatus)
    } catch (err) {
      console.error('Error loading exams:', err)
      setError('Failed to load exams')
    }
  }

  const handleStartExam = (examId: string) => {
    router.push(`/student/cbt/${examId}`)
  }

  const handleViewResults = (examId: string) => {
    router.push(`/student/cbt/${examId}/results`)
  }

  const canAttempt = (exam: ExamWithSubmission) => {
    return exam.status === 'active' || (exam.status === 'upcoming' && exam.status !== 'attempted')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading exams...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💻 CBT Exams</h1>
          <p className="text-gray-600">View and attempt computer-based tests</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Exams List */}
        <div className="space-y-4">
          {exams.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600">
              No exams available yet.
            </div>
          ) : (
            <>
              {/* Active Exams */}
              {exams.filter(e => e.status === 'active').length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-red-600 mb-3">🟢 Active Exams</h2>
                  {exams
                    .filter(e => e.status === 'active')
                    .map(exam => (
                      <div
                        key={exam.id}
                        className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 hover:shadow-lg transition-shadow mb-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                            {exam.description && (
                              <p className="text-sm text-gray-600 mt-1">{exam.description}</p>
                            )}
                          </div>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            🟢 Active Now
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Type</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {exam.examType === 'TEST' && exam.testNumber
                                ? `Test ${exam.testNumber}`
                                : exam.examType}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Duration</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {exam.durationMinutes}m
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Questions</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {exam.questionCount || 0}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Total Marks</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {exam.totalMarks || '-'}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                          Ends: {new Date(exam.endTime).toLocaleString()}
                        </p>

                        <button
                          onClick={() => handleStartExam(exam.id)}
                          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          Start Exam Now
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* Attempted Exams */}
              {exams.filter(e => e.status === 'attempted').length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-green-600 mb-3">✓ Completed Exams</h2>
                  {exams
                    .filter(e => e.status === 'attempted')
                    .map(exam => (
                      <div
                        key={exam.id}
                        className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow mb-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                          </div>
                          <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              ✓ Attempted
                            </span>
                            {exam.score && (
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                Score: {exam.score}/{exam.totalMarks || '?'}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                          Submitted: {exam.submittedAt ? new Date(exam.submittedAt).toLocaleString() : '-'}
                        </p>

                        <button
                          onClick={() => handleViewResults(exam.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                        >
                          View Results
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* Upcoming Exams */}
              {exams.filter(e => e.status === 'upcoming').length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-blue-600 mb-3">⏰ Upcoming Exams</h2>
                  {exams
                    .filter(e => e.status === 'upcoming')
                    .map(exam => (
                      <div
                        key={exam.id}
                        className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow mb-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                            {exam.description && (
                              <p className="text-sm text-gray-600 mt-1">{exam.description}</p>
                            )}
                          </div>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            ⏰ Upcoming
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                          Starts: {new Date(exam.startTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                          Ends: {new Date(exam.endTime).toLocaleString()}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Duration</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {exam.durationMinutes}m
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-xs text-gray-600">Total Marks</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {exam.totalMarks || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Completed Exams (expired) */}
              {exams.filter(e => e.status === 'completed' && !e.attempted).length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-600 mb-3">
                    ✗ Exams Completed/Expired
                  </h2>
                  {exams
                    .filter(e => e.status === 'completed' && !e.attempted)
                    .map(exam => (
                      <div
                        key={exam.id}
                        className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-400 hover:shadow-lg transition-shadow mb-3 opacity-75"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              This exam has ended and you did not attempt it.
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
                            Ended
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
