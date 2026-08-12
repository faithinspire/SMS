'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AssignmentService } from '@/services/assignment.service'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase-client'

interface Assignment {
  id: string
  title: string
  description: string
  instructions: string
  dueDate?: string
  maxMarks?: number
  createdAt: string
}

interface AssignmentWithSubmission extends Assignment {
  submission?: {
    submittedAt?: string
    marksAwarded?: number
    feedback?: string
    isLate: boolean
  }
}

interface StudentSubject {
  subjectId: string
  subjectName: string
  teacherName: string
}

export default function StudentAssignmentsPage() {
  const router = useRouter()
  const { user, school } = useAuth()

  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([])
  const [selectedSubject, setSelectedSubject] = useState<StudentSubject | null>(null)
  const [subjects, setSubjects] = useState<StudentSubject[]>([])
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

      // Get student's subjects
      const { data: studentSubjects, error: subjectsError } = await supabase
        .from('student_subjects')
        .select('subject_id, subject_teacher_id, subjects(id, name), users(full_name)')
        .eq('student_id', sid)
        .eq('school_id', school.id)

      if (subjectsError) throw subjectsError

      const subjectsList: StudentSubject[] =
        studentSubjects?.map((ss: any) => ({
          subjectId: ss.subject_id,
          subjectName: ss.subjects?.name || 'Unknown',
          teacherName: ss.users?.full_name || 'Unknown Teacher',
        })) || []

      setSubjects(subjectsList)
      if (subjectsList.length > 0) {
        setSelectedSubject(subjectsList[0])
        await loadAssignments(sid, subjectsList[0].subjectId)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading student data:', err)
      setError('Failed to load assignments')
      setLoading(false)
    }
  }

  const loadAssignments = async (studentId: string, subjectId: string) => {
    try {
      if (!school) return

      const assignmentsData = await AssignmentService.getAssignmentsForStudent(
        studentId,
        subjectId,
        school.id
      )

      // Get submission status for each assignment
      const withSubmissions = await Promise.all(
        assignmentsData.map(async (assignment: any) => {
          const submission = await AssignmentService.getStudentSubmission(
            assignment.id,
            studentId,
            school.id
          )

          return {
            ...assignment,
            submission,
          }
        })
      )

      setAssignments(withSubmissions)
    } catch (err) {
      console.error('Error loading assignments:', err)
      setError('Failed to load assignments')
    }
  }

  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = subjects.find(s => s.subjectId === e.target.value)
    if (selected && studentId) {
      setSelectedSubject(selected)
      await loadAssignments(studentId, selected.subjectId)
    }
  }

  const handleSubmitAssignment = (assignmentId: string) => {
    router.push(`/student/assignments/${assignmentId}/submit`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading assignments...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">✏️ Assignments</h1>
          <p className="text-gray-600">View and submit assignments from your teachers</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Subject Selector */}
        {subjects.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject:</label>
            <select
              value={selectedSubject?.subjectId || ''}
              onChange={handleSubjectChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {subjects.map(subject => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.subjectName} - {subject.teacherName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600">
              No assignments available yet for this subject.
            </div>
          ) : (
            assignments.map(assignment => {
              const isDue = assignment.dueDate && new Date(assignment.dueDate) < new Date()
              const isSubmitted = !!assignment.submission?.submittedAt
              const isLate = assignment.submission?.isLate
              const isGraded = !!assignment.submission?.marksAwarded

              return (
                <div
                  key={assignment.id}
                  className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{assignment.title}</h3>
                      {assignment.dueDate && (
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isSubmitted && (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isLate
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isLate ? '⏰ Late' : '✓ Submitted'}
                        </span>
                      )}
                      {!isSubmitted && isDue && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          ⚠️ Overdue
                        </span>
                      )}
                      {!isSubmitted && !isDue && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          📋 Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3 line-clamp-2">{assignment.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">Max Marks</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {assignment.maxMarks || '-'}
                      </p>
                    </div>
                    {isSubmitted && isGraded && (
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-xs text-gray-600">Your Score</p>
                        <p className="text-sm font-semibold text-green-700">
                          {assignment.submission?.marksAwarded} /{assignment.maxMarks}
                        </p>
                      </div>
                    )}
                    {isSubmitted && !isGraded && (
                      <div className="bg-yellow-50 p-2 rounded">
                        <p className="text-xs text-gray-600">Status</p>
                        <p className="text-sm font-semibold text-yellow-700">Pending Grading</p>
                      </div>
                    )}
                  </div>

                  {assignment.submission?.feedback && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-medium text-blue-900">Teacher Feedback:</p>
                      <p className="text-sm text-blue-800">{assignment.submission.feedback}</p>
                    </div>
                  )}

                  <button
                    onClick={() => handleSubmitAssignment(assignment.id)}
                    disabled={isSubmitted && !isDue}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                      isSubmitted && !isDue
                        ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isSubmitted ? 'View/Resubmit' : 'Submit Assignment'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
