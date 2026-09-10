'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import EnhancedHeader from '@/components/EnhancedHeader'
import toast from 'react-hot-toast'

interface Assignment {
  id: string
  title: string
  description?: string
  teacher_name: string
  subject_name: string
  due_date?: string
  max_marks?: number
  instructions?: string
}

interface Submission {
  id: string
  submitted_at: string
  marks_awarded?: number
  feedback?: string
  is_late?: boolean
  file_path?: string
}

export default function StudentAssignmentPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Get current user
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser || currentUser.role !== 'STUDENT') {
        router.push('/auth/student/login')
        return
      }

      setUser(currentUser)

      // Get student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .single()

      if (studentError || !studentData) {
        setError('Student record not found')
        return
      }

      const studentId = studentData.id

      // Get assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          id, title, description, due_date, max_marks, instructions,
          subjects(name),
          users!teacher_id(full_name)
        `)
        .eq('id', assignmentId)
        .eq('school_id', currentUser.school_id)
        .single()

      if (assignmentError || !assignmentData) {
        setError('Assignment not found')
        return
      }

      setAssignment({
        id: assignmentData.id,
        title: assignmentData.title,
        description: assignmentData.description,
        teacher_name: assignmentData.users?.full_name || 'Unknown Teacher',
        subject_name: assignmentData.subjects?.name || 'Unknown Subject',
        due_date: assignmentData.due_date,
        max_marks: assignmentData.max_marks,
        instructions: assignmentData.instructions,
      })

      // Check for existing submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .single()

      if (submissionData) {
        setSubmission(submissionData)
      }
    } catch (err: any) {
      console.error('Error loading assignment:', err)
      setError(err.message || 'Failed to load assignment')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setUploading(true)

    try {
      if (!file && !submission) {
        setError('Please select a file to upload')
        setUploading(false)
        return
      }

      // Get student data
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user?.id)
        .eq('school_id', user?.school_id)
        .single()

      const studentId = studentData?.id

      if (!studentId) {
        setError('Student record not found')
        setUploading(false)
        return
      }

      let filePath = submission?.file_path

      // Upload file if provided
      if (file) {
        const timestamp = Date.now()
        const fileName = `${user?.id}/${assignmentId}/${timestamp}-${file.name}`
        filePath = `assignments/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { upsert: true })

        if (uploadError) {
          setError('Failed to upload file: ' + uploadError.message)
          setUploading(false)
          return
        }
      }

      // Create or update submission
      if (submission) {
        // Update existing submission
        const { error: updateError } = await supabase
          .from('assignment_submissions')
          .update({
            file_path: filePath,
            submitted_at: new Date().toISOString(),
            is_late: assignment?.due_date
              ? new Date().getTime() > new Date(assignment.due_date).getTime()
              : false,
            feedback: remarks || null,
          })
          .eq('id', submission.id)

        if (updateError) throw updateError
      } else {
        // Create new submission
        const { error: insertError } = await supabase
          .from('assignment_submissions')
          .insert([
            {
              assignment_id: assignmentId,
              student_id: studentId,
              school_id: user?.school_id,
              file_path: filePath,
              submitted_at: new Date().toISOString(),
              is_late: assignment?.due_date
                ? new Date().getTime() > new Date(assignment.due_date).getTime()
                : false,
              feedback: remarks || null,
            },
          ])

        if (insertError) throw insertError
      }

      setSuccess('✅ Assignment submitted successfully!')
      setFile(null)
      setRemarks('')
      
      // Reload submission
      setTimeout(() => {
        loadData()
      }, 1500)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to submit assignment')
    } finally {
      setUploading(false)
    }
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

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <EnhancedHeader
          staffName={user?.full_name || 'Student'}
          schoolName={user?.school_id || 'School'}
          userRole="Student"
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {error || 'Assignment not found'}
          </div>
        </div>
      </div>
    )
  }

  const isOverdue = assignment.due_date
    ? new Date().getTime() > new Date(assignment.due_date).getTime()
    : false

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <EnhancedHeader
        staffName={user?.full_name || 'Student'}
        schoolName={user?.school_id || 'School'}
        userRole="Student"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2"
        >
          ← Back to Assignments
        </button>

        {/* Assignment Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-gray-600 mt-2">{assignment.subject_name}</p>
              <p className="text-sm text-gray-500 mt-1">👨‍🏫 {assignment.teacher_name}</p>
            </div>
            <div className="text-right">
              {submission ? (
                <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold text-sm">
                  ✓ Submitted
                </span>
              ) : (
                <span className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${
                  isOverdue
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isOverdue ? '⚠️ Overdue' : '⏱️ Pending'}
                </span>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-t border-gray-200">
            {assignment.due_date && (
              <div>
                <p className="text-sm text-gray-600">Due Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(assignment.due_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
            {assignment.max_marks && (
              <div>
                <p className="text-sm text-gray-600">Max Marks</p>
                <p className="text-lg font-semibold text-gray-900">{assignment.max_marks}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {assignment.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-700">{assignment.description}</p>
            </div>
          )}

          {/* Instructions */}
          {assignment.instructions && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Instructions</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{assignment.instructions}</p>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
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

        {/* Submission Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {submission ? '📝 Update Submission' : '📤 Submit Assignment'}
          </h2>

          <form onSubmit={handleSubmitAssignment} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select File *
              </label>
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <label htmlFor="file-input" className="cursor-pointer">
                  <div className="text-4xl mb-2">📎</div>
                  <p className="text-gray-700 font-semibold">Click to upload or drag and drop</p>
                  <p className="text-gray-500 text-sm mt-1">PDF, DOCX, TXT, or images (max 10MB)</p>
                  {file && (
                    <p className="text-green-600 font-semibold mt-2">✓ {file.name}</p>
                  )}
                  {submission?.file_path && !file && (
                    <p className="text-blue-600 text-sm mt-2">
                      Previous submission: {submission.file_path.split('/').pop()}
                    </p>
                  )}
                </label>
                <input
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Comments/Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any comments about your submission..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            {/* Submission Status */}
            {submission && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Last submitted: {new Date(submission.submitted_at).toLocaleString()}
                </p>
                {submission.marks_awarded !== null && (
                  <p className="text-lg font-semibold text-blue-700 mt-2">
                    Marks: {submission.marks_awarded}/{assignment.max_marks}
                  </p>
                )}
                {submission.feedback && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-700">Teacher Feedback:</p>
                    <p className="text-gray-700 mt-1">{submission.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || (!file && !submission)}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
            >
              {uploading
                ? '⏳ Submitting...'
                : submission
                ? '✏️ Update Submission'
                : '📤 Submit Assignment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
