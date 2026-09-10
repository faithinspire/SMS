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
  subject_name: string
  class_name: string
  due_date?: string
  max_marks?: number
  created_at: string
  submission_count: number
}

interface Submission {
  id: string
  student_name: string
  admission_number: string
  submitted_at?: string
  marks_awarded?: number
  feedback?: string
  is_late?: boolean
}

export default function TeacherAssignmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    class_arm_combo_id: '',
    due_date: '',
    max_marks: '',
    instructions: '',
  })
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    loadTeacherData()
  }, [])

  useEffect(() => {
    if (selectedAssignment) {
      loadSubmissions(selectedAssignment.id)
    }
  }, [selectedAssignment])

  const loadTeacherData = async () => {
    try {
      setLoading(true)
      setError('')

      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser || currentUser.role !== 'TEACHER') {
        router.push('/auth/staff/login')
        return
      }

      setUser(currentUser)
      setContext(currentUser)
      console.log('[Assignments] Loading for teacher:', currentUser.id)

      // Load subjects taught by this teacher
      const { data: subjectData, error: subjectError } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          subject_id,
          subjects!inner(id, name)
        `)
        .eq('teacher_id', currentUser.id)
        .eq('school_id', currentUser.school_id)

      if (subjectError) {
        console.error('[Assignments] Subject error:', subjectError)
      } else {
        const uniqueSubjects = Array.from(
          new Map(
            (subjectData || []).map((s: any) => [s.subjects?.id, s.subjects]) || []
          ).values()
        ).filter((s): s is any => s !== undefined)
        setSubjects(uniqueSubjects)
      }

      // Load classes
      const { data: classComboData, error: classError } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          class_arm_combo_id,
          class_arm_combos(
            id,
            classes(name),
            arms(name)
          )
        `)
        .eq('teacher_id', currentUser.id)
        .eq('school_id', currentUser.school_id)

      if (classError) {
        console.error('[Assignments] Class error:', classError)
      } else {
        const uniqueClasses = Array.from(
          new Map(
            (classComboData || []).map((c: any) => {
              const combo = c.class_arm_combos
              const className = combo?.classes?.name || 'Unknown'
              const armName = combo?.arms?.name || ''
              const fullName = armName ? `${className} ${armName}` : className
              return [combo?.id, { id: combo?.id, name: fullName }]
            }) || []
          ).values()
        ).filter((c): c is any => c && c.id !== undefined)
        setClasses(uniqueClasses)
      }

      // Load assignments - try with teacher_id first, then created_by
      let assignmentData: any[] = []

      const { data: tryTeacherId, error: errorTeacherId } = await supabase
        .from('assignments')
        .select(`
          id, title, description, instructions, due_date, max_marks, created_at,
          subject_id, class_arm_combo_id, teacher_id
        `)
        .eq('teacher_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (errorTeacherId) {
        console.warn('[Assignments] teacher_id filter failed:', errorTeacherId)
        // Try with created_by
        const { data: tryCreatedBy, error: errorCreatedBy } = await supabase
          .from('assignments')
          .select(`
            id, title, description, instructions, due_date, max_marks, created_at,
            subject_id, class_arm_combo_id
          `)
          .eq('created_by', currentUser.id)
          .eq('school_id', currentUser.school_id)
          .order('created_at', { ascending: false })

        if (errorCreatedBy) {
          console.error('[Assignments] Both filters failed')
          throw errorCreatedBy
        }
        assignmentData = tryCreatedBy || []
      } else {
        assignmentData = tryTeacherId || []
      }

      // Count submissions for each assignment
      const submissionCounts = new Map()
      for (const assignment of assignmentData || []) {
        const { count } = await supabase
          .from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id)

        submissionCounts.set(assignment.id, count || 0)
      }

      // Format assignments
      const formattedAssignments = (assignmentData || []).map((a: any) => {
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          subject_name: 'Subject',
          class_name: 'Class',
          due_date: a.due_date,
          max_marks: a.max_marks,
          created_at: a.created_at,
          submission_count: submissionCounts.get(a.id) || 0,
        }
      })

      setAssignments(formattedAssignments)
    } catch (err: any) {
      console.error('[Assignments] Error:', err)
      setError(err.message || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async (assignmentId: string) => {
    try {
      const { data: submissionData, error: submissionError } = await supabase
        .from('assignment_submissions')
        .select(`
          id, submitted_at, marks_awarded, feedback, is_late,
          students(
            admission_number,
            users(full_name)
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false })

      if (submissionError) {
        throw submissionError
      }

      const formattedSubmissions = (submissionData || []).map((s: any) => ({
        id: s.id,
        student_name: s.students?.users?.full_name || 'Unknown',
        admission_number: s.students?.admission_number || 'N/A',
        submitted_at: s.submitted_at,
        marks_awarded: s.marks_awarded,
        feedback: s.feedback,
        is_late: s.is_late,
      }))

      setSubmissions(formattedSubmissions)
    } catch (err: any) {
      console.error('[Assignments] Submission error:', err)
      setError(err.message || 'Failed to load submissions')
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (!formData.title || !formData.subject_id || !formData.class_arm_combo_id) {
        setError('Please fill all required fields')
        setSaving(false)
        return
      }

      // Upload file if selected
      let filePath = ''
      let fileName = ''
      let fileSize = 0

      if (file) {
        try {
          const timestamp = Date.now()
          const fileName_temp = `${timestamp}-${file.name}`
          const bucketPath = `assignment-files/${user?.school_id}/${user?.id}/${fileName_temp}`

          const { error: uploadError } = await supabase.storage
            .from('assignment-files')
            .upload(bucketPath, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            throw new Error(`File upload failed: ${uploadError.message}`)
          }

          filePath = bucketPath
          fileName = file.name
          fileSize = file.size
          console.log('[Assignments] File uploaded:', filePath)
        } catch (fileErr: any) {
          setError(`Upload failed: ${fileErr.message}`)
          setSaving(false)
          return
        }
      }

      // Build insert data with teacher_id as PRIMARY identifier
      // DO NOT include created_by - it doesn't exist in our schema
      const insertData: any = {
        school_id: user?.school_id,
        teacher_id: user?.id,  // THIS IS PRIMARY - teacher_id identifies who created it
        subject_id: formData.subject_id,
        class_arm_combo_id: formData.class_arm_combo_id,
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        due_date: formData.due_date,
        max_marks: formData.max_marks ? parseInt(formData.max_marks) : null,
        status: 'ACTIVE',
        file_path: filePath || null,
        file_name: fileName || null,
        file_size: fileSize || null,
      }

      const { error: insertError } = await supabase
        .from('assignments')
        .insert([insertData])

      if (insertError) {
        console.error('[Assignments] Insert error:', insertError)
        setError(`Failed to create assignment: ${insertError.message}`)
        setSaving(false)
        return
      }

      setFormData({
        title: '',
        description: '',
        subject_id: '',
        class_arm_combo_id: '',
        due_date: '',
        max_marks: '',
        instructions: '',
      })
      setFile(null)
      setShowForm(false)

      // Reload assignments
      setTimeout(() => {
        loadTeacherData()
      }, 1000)
    } catch (err: any) {
      console.error('[Assignments] Exception:', err)
      setError(err.message || 'Failed to create assignment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <EnhancedHeader
          staffName="Loading..."
          schoolName="School"
          userRole="Teacher"
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
        staffName={context?.full_name || 'Teacher'}
        schoolName={context?.school_id || 'School'}
        userRole="Teacher"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📋 Assignments</h1>
            <p className="text-gray-600 mt-1">Create and grade student assignments</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            {showForm ? '✖ Cancel' : '✚ New Assignment'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    name="subject_id"
                    value={formData.subject_id}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    name="class_arm_combo_id"
                    value={formData.class_arm_combo_id}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Assignment Title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Brief description of the assignment"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                ></textarea>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleFormChange}
                  placeholder="Detailed instructions for the assignment"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Due Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Max Marks */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    name="max_marks"
                    value={formData.max_marks}
                    onChange={handleFormChange}
                    placeholder="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📎 Upload Assignment File (Optional)
                </label>
                <div className="mb-3">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    accept=".pdf,.doc,.docx,.pptx,.txt,.xlsx,.jpg,.png,.zip"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Accepted formats: PDF, DOC, DOCX, PPTX, TXT, XLSX, JPG, PNG, ZIP
                  </p>
                </div>
                {file && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                    ✓ Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition-colors"
              >
                {saving ? 'Creating...' : '✚ Create Assignment'}
              </button>
            </form>
          </div>
        )}

        {/* Assignments List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignments Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold">My Assignments</h2>
              </div>
              {assignments.length === 0 ? (
                <div className="p-6 text-center text-gray-600">
                  <p>No assignments yet</p>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {assignments.map((assignment) => (
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
                      <p className="text-xs text-gray-600 mt-1">{assignment.subject_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{assignment.class_name}</p>
                      <p className="text-xs text-blue-600 mt-2 font-semibold">
                        {assignment.submission_count} submissions
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submissions Column */}
          <div className="lg:col-span-2">
            {selectedAssignment ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4">
                  <h2 className="text-xl font-bold">{selectedAssignment.title}</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    {selectedAssignment.subject_name} • {selectedAssignment.class_name}
                  </p>
                </div>

                {/* Assignment Details */}
                <div className="p-6 border-b border-gray-200">
                  {selectedAssignment.description && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">{selectedAssignment.description}</p>
                    </div>
                  )}
                  {selectedAssignment.due_date && (
                    <p className="text-xs text-gray-500">
                      📅 Due: {new Date(selectedAssignment.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Submissions List */}
                {submissions.length === 0 ? (
                  <div className="p-6 text-center text-gray-600">
                    <p>No submissions yet</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-sm">{submission.student_name}</p>
                            <p className="text-xs text-gray-600">{submission.admission_number}</p>
                            {submission.submitted_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {submission.marks_awarded !== null ? (
                              <p className="text-sm font-bold text-green-600">
                                {submission.marks_awarded}/{selectedAssignment.max_marks}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500">Not graded</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p>Select an assignment to view submissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
