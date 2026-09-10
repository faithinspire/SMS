'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import EnhancedHeader from '@/components/EnhancedHeader'

interface LessonNote {
  id: string
  lesson_date?: string
  topic: string
  subject_name: string
  class_name: string
  file_name?: string
  status?: string
  submitted_at: string
  reviewer_feedback?: string
  approval_status?: string
}

export default function TeacherLessonNotesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    content: '',
    subject_id: '',
    class_arm_combo_id: '',
  })
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    loadTeacherData()
  }, [])

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
      console.log('[LessonNotes] Loading for teacher:', currentUser.id)

      // Load subjects taught by this teacher using subject_teacher_assignments
      const { data: subjectData, error: subjectError } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          subject_id,
          subjects!inner(id, name)
        `)
        .eq('teacher_id', currentUser.id)
        .eq('school_id', currentUser.school_id)

      if (subjectError) {
        console.error('[LessonNotes] Subject error:', subjectError)
      } else {
        const uniqueSubjects = Array.from(
          new Map(
            (subjectData || []).map((s: any) => [s.subjects?.id, s.subjects]) || []
          ).values()
        ).filter((s): s is any => s !== undefined)
        setSubjects(uniqueSubjects)
        console.log('[LessonNotes] Loaded subjects:', uniqueSubjects.length)
      }

      // Load classes taught by this teacher
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
        console.error('[LessonNotes] Class error:', classError)
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
        console.log('[LessonNotes] Loaded classes:', uniqueClasses.length)
      }

      // Load lesson notes
      const { data: notesData, error: notesError } = await supabase
        .from('lesson_notes')
        .select(`
          id, topic, content_summary, created_at, status, file_name,
          subject_id,
          class_arm_combo_id
        `)
        .eq('teacher_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (notesError) {
        console.error('[LessonNotes] Notes error:', notesError)
      } else {
        const formattedNotes = (notesData || []).map((note: any) => {
          return {
            id: note.id,
            title: note.topic || 'Untitled',
            topic: note.topic || 'Untitled',
            subject_name: 'Subject',
            class_name: 'Class',
            file_name: note.file_name,
            submitted_at: note.created_at,
            status: note.status || 'SUBMITTED',
          }
        })

        setLessonNotes(formattedNotes)
      }
    } catch (err: any) {
      console.error('[LessonNotes] Error:', err)
      setError(err.message || 'Failed to load lesson notes')
    } finally {
      setLoading(false)
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

  const handleSubmitLessonNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setUploading(true)

    try {
      if (!formData.title || !formData.subject_id || !formData.class_arm_combo_id || !formData.content) {
        setError('Please fill all required fields')
        setUploading(false)
        return
      }

      let filePath = ''
      let fileName = ''
      let fileSize = 0

      // Upload file if selected
      if (file) {
        try {
          const timestamp = Date.now()
          const fileName_temp = `${timestamp}-${file.name}`
          const bucketPath = `lesson-notes/${user?.school_id}/${user?.id}/${fileName_temp}`

          const { error: uploadError } = await supabase.storage
            .from('lesson-uploads')
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
          console.log('[LessonNotes] File uploaded:', filePath)
        } catch (fileErr: any) {
          setError(`Upload failed: ${fileErr.message}`)
          setUploading(false)
          return
        }
      }

      // Build insert data - don't include term_id (will be NULL by default)
      const insertData: any = {
        school_id: user?.school_id,
        teacher_id: user?.id,
        teacher_name: user?.full_name || 'Teacher',
        subject_id: formData.subject_id,
        class_arm_combo_id: formData.class_arm_combo_id,
        topic: formData.title,
        content_summary: formData.content,
        learning_objectives: '',
        lesson_date: new Date().toISOString().split('T')[0],
        file_path: filePath || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      }
      // Don't include term_id - let it be NULL in database
      
      const { error: insertError } = await supabase
        .from('lesson_notes')
        .insert([insertData])

      if (insertError) {
        setError(insertError.message)
      } else {
        setSuccess('Lesson note created successfully!')
        setFormData({
          title: '',
          topic: '',
          content: '',
          subject_id: '',
          class_arm_combo_id: '',
        })
        setFile(null)
        setShowForm(false)

        // Reload lesson notes
        setTimeout(() => {
          loadTeacherData()
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create lesson note')
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
            <h1 className="text-4xl font-bold text-gray-900">📝 Lesson Notes</h1>
            <p className="text-gray-600 mt-1">Create and manage your lesson notes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            {showForm ? '✖ Cancel' : '✚ New Lesson Note'}
          </button>
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

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <form onSubmit={handleSubmitLessonNote} className="space-y-6">
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

              {/* Topic */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Topic *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Lesson Topic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Content Summary */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content Summary *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleFormChange}
                  placeholder="Brief summary of the lesson..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  required
                ></textarea>
              </div>

              {/* File Upload - VISIBLE HERE */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  📎 Upload Lesson File (Optional)
                </label>
                <div className="mb-3">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    accept=".pdf,.doc,.docx,.pptx,.txt,.xlsx"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Accepted formats: PDF, DOC, DOCX, PPTX, TXT, XLSX
                  </p>
                </div>
                {file && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                    ✓ Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition-colors"
              >
                {uploading ? '⏳ Creating...' : '💾 Create Lesson Note'}
              </button>
            </form>
          </div>
        )}

        {/* Lesson Notes List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {lessonNotes.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg">No lesson notes yet</p>
              <p className="text-sm mt-2">Create your first lesson note to get started</p>
            </div>
          ) : (
            <div className="divide-y">
              {lessonNotes.map((note) => (
                <div key={note.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{note.topic}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        📚 {note.subject_name} • 🏫 {note.class_name}
                      </p>
                      {note.file_name && (
                        <p className="text-sm text-blue-600 mt-2 font-semibold">
                          📎 File: {note.file_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Created: {new Date(note.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        ✓ {note.status || 'Published'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
