'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import ExamInterface from './exam-interface'

export default function CBTExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [examData, setExamData] = useState<any>(null)

  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true)

        // Get from session or URL params
        const schoolId = localStorage.getItem('school_id')
        const studentId = localStorage.getItem('student_id')

        if (!schoolId || !studentId) {
          setError('Student ID or School ID not found. Please log in again.')
          router.push('/auth/student/login')
          return
        }

        // Start exam (creates submission)
        const startResponse = await fetch('/api/student/cbt/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_id: schoolId,
            student_id: studentId,
            cbt_exam_id: examId,
          }),
        })

        if (!startResponse.ok) {
          const data = await startResponse.json()
          setError(data.error || 'Failed to start exam')
          return
        }

        const data = await startResponse.json()
        setExamData(data)
      } catch (err: any) {
        console.error('Error loading exam:', err)
        setError(err.message || 'Failed to load exam')
      } finally {
        setLoading(false)
      }
    }

    if (examId) {
      loadExam()
    }
  }, [examId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Exam</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/student/cbt')}
            className="px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
          >
            Back to Exams
          </button>
        </div>
      </div>
    )
  }

  if (!examData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No exam data available</p>
      </div>
    )
  }

  return (
    <ExamInterface
      submissionId={examData.submission.id}
      examId={examId}
      studentHeader={examData.student_header}
      questions={examData.questions}
      duration_minutes={examData.exam.duration_minutes}
      total_marks={examData.exam.total_marks}
      schoolId={localStorage.getItem('school_id') || ''}
    />
  )
}
