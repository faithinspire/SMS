'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import EnhancedHeader from '@/components/EnhancedHeader'

interface Assignment {
  id: string
  title: string
  description?: string
  instructions?: string
  subject_name: string
  class_name: string
  teacher_name: string
  due_date?: string
  max_marks?: number
  created_at: string
  status?: string
}

interface StudentSubmission {
  id: string
  assignment_id: string
  submitted_at?: string
  marks_awarded?: number
  feedback?: string
  file_name?: string
  submission_status?: string
}

export default function StudentAssignmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<StudentSubmission | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadStudentData()
  }, [])

  useEffect(() => {
    if (selectedAssignment) {
      loadStudentSubmission(selectedAssignment.id)
    }
  }, [selectedAssignment])

  const loadStudentData = async () => {
    try {
      setLoading(true)
      setError('')

      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser || currentUser.role !== 'STUDENT') {
        router.push('/auth/student/login')
        return
      }

      setUser(currentUser)
      setContext(currentUser)
      console.log('[StudentAssignments] Loading for student:', currentUser.id)

      // Get student record to find their class
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id, class_arm_combo_id
        `)
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .single()

      if (studentError) {
        console.error('[StudentAssignments] Student error:', studentError)
        setError('Could not load student information')
        return
      }

      const studentClassId = studentData?.class_arm_combo_id

      // Load assignments for student's class
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          id, title, description, instructions, due_date, max_marks, created_at, status,
          subject_id,
          class_arm_combo_id,
          teacher_id
        `)
        .eq('class_arm_combo_id', studentClassId)
        .eq('school_id', currentUser.school_id)
        .order('due_date', { ascending: false })

      if (assignmentError) {
        console.error('[StudentAssignments] Assignment error:', assignmentError)
        setError('Failed to load assignments')
        return
      }

      // Enrich assignment data with teacher names
      const enrichedAssignments = await Promise.all(
        (assignmentData || []).map(async (assignment: any) => {
          // Get teacher name
          let teacherName = 'Unknown'
          if (assignment.teacher_id) {
            const { data: teacherData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', assignment.teacher_id)
              .single()
            teacherName = teacherData?.full_name || 'Unknown'
          }

          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            instructions: assignment.instructions,
            subject_name: 'Subject',
            class_name: 'Class',
            teacher_name: teacherName,
            due_date: assignment.due_date,
            max_marks: assignment.max_marks,
            created_at: assignment.created_at,
            status: assignment.status || 'ACTIVE',
          }
        })
      )

      setAssignments(enrichedAssignments)
      console.log('[StudentAssignments] Loaded', enrichedAssignments.length, 'assignments')
    } catch (err: any) {
      console.error('[StudentAssignments] Error:', err)
      setError(err.message || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentSubmission = async (assignmentId: string) => {
    try {
      // Get student ID
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!studentData) return

      // Get student's submission for this assignment
      const { data: submissionData } = await supabase
        .from('assignment_submissions')
        .select(`
          id, submitted_at, marks_awarded, feedback, file_name, submission_status
        `)
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentData.id)
        .single()

      if (submissionData) {
        setSubmission(submissionData)
      } else {
        setSubmission(null)
      }
    } catch (err: any) {
      console.error('[StudentAssignments] Submission load error:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !file) {
      setError('Please select a file to submit')
      return
    }

    setUploadingFile(true)
    setError('')
    setSuccess('')

    try {
      // Get student ID
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!studentData) {
        setError('Student record not found')
        setUploadingFile(false)
        return
      }

      const studentId = studentData.id

      // Upload file to storage
      const timestamp = Date.now()
      const fileName = `${timestamp}-${file.name}`
      const bucketPath = `assignment-submissions/${user?.school_id}/${selectedAssignment.id}/${studentId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('student-assignments')
        .upload(bucketPath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`)
      }

      console.log('[StudentAssignments] File uploaded:', bucketPath)

      // Check if student already has a submission
      const { data: existingSubmission } = await supabase
        .from('assignment_submissions')
        .select('id')
        .eq('assignment_id', selectedAssignment.id)
        .eq('student_id', studentId)
        .single()

      if (existingSubmission) {
        // Update existing submission
        const { error: updateError } = await supabase
          .from('assignment_submissions')
          .update({
            file_path: bucketPath,
            file_name: file.name,
            file_size: file.size,
            submitted_at: new Date().toISOString(),
            submission_status: 'SUBMITTED',
          })
          .eq('id', existingSubmission.id)

        if (updateError) {
          throw updateError
        }
      } else {
        // Create new submission
        const { error: insertError } = await supabase
          .from('assignment_submissions')
          .insert([
            {
              assignment_id: selectedAssignment.id,
              student_id: studentId,
              school_id: user?.school_id,
              file_path: bucketPath,
              file_name: file.name,
              file_size: file.size,
              submitted_at: new Date().toISOString(),
              submission_status: 'SUBMITTED',
            },
          ])

        if (insertError) {
          throw insertError
        }
      }

      setSuccess('Assignment submitted successfully!')
      setFile(null)

      // Reload submissions
      setTimeout(() => {
        loadStudentSubmission(selectedAssignment.id)
      }, 1000)
    } catch (err: any) {
      console.error('[StudentAssignments] Submit error:', err)
      setError(err.message || 'Failed to submit assignment')
    } finally {
      setUploadingFile(false)
    }
  }

  const isAssignmentDue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <EnhancedHeader
          staffName="Loading..."
          schoolName="School"
          userRole="Student"
        />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-pink-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <EnhancedHeader
        staffName={context?.full_name || 'Student'}
        schoolName={context?.school_id || 'School'}
        userRole="Student"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">📚 My Assignments</h1>
          <p className="text-gray-600 mt-1">View and submit your assignments</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Assignments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignments List Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold">Assignments ({assignments.length})</h2>
              </div>
              {assignments.length === 0 ? (
                <div className="p-6 text-center text-gray-600">
                  <p>No assignments yet</p>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {assignments.map((assignment) => {
                    const isDue = isAssignmentDue(assignment.due_date)
                    return (
                      <button
                        key={assignment.id}
                        onClick={() => setSelectedAssignment(assignment)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                          selectedAssignment?.id === assignment.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <h3 className="font-bold text-gray-900 text-sm">{assignment.title}</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          👨‍🏫 {assignment.teacher_name}
                        </p>
                        {assignment.due_date && (
                          <p className={`text-xs mt-2 ${isDue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {isDue ? '⚠️ Overdue: ' : '📅 Due: '}
                            {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Assignment Details & Submission Column */}
          <div className="lg:col-span-2">
            {selectedAssignment ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 text-white px-6 py-4">
                  <h2 className="text-2xl font-bold">{selectedAssignment.title}</h2>
                  <p className="text-sm text-blue-100 mt-2">
                    👨‍🏫 {selectedAssignment.teacher_name}
                  </p>
                </div>

                {/* Assignment Details */}
                <div className="p-6 border-b border-gray-200 space-y-4">
                  {selectedAssignment.description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-600 text-sm">{selectedAssignment.description}</p>
                    </div>
                  )}

                  {selectedAssignment.instructions && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">
                        {selectedAssignment.instructions}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {selectedAssignment.due_date && (
                      <div>
                        <p className="text-xs text-gray-500">Due Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedAssignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedAssignment.max_marks && (
                      <div>
                        <p className="text-xs text-gray-500">Max Marks</p>
                        <p className="font-semibold text-gray-900">
                          {selectedAssignment.max_marks}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission Status & Upload Section */}
                <div className="p-6 space-y-4">
                  {submission ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-3">✓ Submitted</h3>
                      <div className="space-y-2 text-sm text-green-800">
                        {submission.file_name && (
                          <p>📎 File: <strong>{submission.file_name}</strong></p>
                        )}
                        {submission.submitted_at && (
                          <p>📅 Submitted: <strong>{new Date(submission.submitted_at).toLocaleDateString()}</strong></p>
                        )}
                        {submission.submission_status && (
                          <p>Status: <strong>{submission.submission_status}</strong></p>
                        )}
                      </div>

                      {submission.marks_awarded !== null && submission.marks_awarded !== undefined ? (
                        <div className="mt-4 bg-white rounded p-3">
                          <p className="text-sm text-gray-600">Grade</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {submission.marks_awarded}/{selectedAssignment.max_marks}
                          </p>
                          {submission.feedback && (
                            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                              <p className="text-xs text-yellow-700 font-semibold mb-1">Feedback from Teacher:</p>
                              <p className="text-sm text-yellow-800">{submission.feedback}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-600">⏳ Awaiting grading...</p>
                      )}

                      {/* Resubmit Option */}
                      <div className="mt-4 border-t border-green-200 pt-4">
                        <p className="text-sm text-gray-700 mb-3">💡 Want to resubmit?</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Select New File
                            </label>
                            <input
                              type="file"
                              onChange={handleFileChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              accept=".pdf,.doc,.docx,.pptx,.txt,.xlsx,.jpg,.png,.zip"
                            />
                            {file && (
                              <p className="text-xs text-green-600 mt-2">
                                ✓ Selected: {file.name}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={handleSubmitAssignment}
                            disabled={uploadingFile || !file}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
                          >
                            {uploadingFile ? '⏳ Resubmitting...' : '📤 Resubmit Assignment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-900 mb-3">📤 Submit Your Work</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Select File to Upload *
                          </label>
                          <input
                            type="file"
                            onChange={handleFileChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            accept=".pdf,.doc,.docx,.pptx,.txt,.xlsx,.jpg,.png,.zip"
                          />
                          <p className="text-xs text-gray-600 mt-2">
                            Accepted: PDF, DOC, DOCX, PPTX, TXT, XLSX, JPG, PNG, ZIP
                          </p>
                          {file && (
                            <p className="text-xs text-green-600 mt-2">
                              ✓ Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                            </p>
                          )}
                        </div>
                        <button
                          onClick={handleSubmitAssignment}
                          disabled={uploadingFile || !file}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
                        >
                          {uploadingFile ? '⏳ Submitting...' : '📤 Submit Assignment'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p className="text-lg">👈 Select an assignment to view details and submit your work</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
