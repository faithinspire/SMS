'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'
import StaffHeader from '@/components/StaffHeader'

interface LessonNote {
  id: string
  topic: string
  content_summary: string
  teacher_name: string
  subject_name: string
  class_name: string
  lesson_date?: string
  file_name?: string
  file_path?: string
  status?: string
  submitted_at: string
  reviewed_by?: string
  reviewed_at?: string
  reviewer_comments?: string
}

export default function HeadteacherLessonNotesReviewPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([])
  const [selectedNote, setSelectedNote] = useState<LessonNote | null>(null)
  const [reviewComments, setReviewComments] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUBMITTED' | 'REVIEWED'>('ALL')

  useEffect(() => {
    loadLessonNotes()
  }, [filterStatus])

  const loadLessonNotes = async () => {
    try {
      setLoading(true)
      setError('')

      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser || currentUser.role !== 'HEADTEACHER') {
        router.push('/auth/staff/login')
        return
      }

      setUser(currentUser)
      setContext(currentUser)
      console.log('[LessonNotesReview] Loading for headteacher:', currentUser.id)

      // Load all lesson notes for the school
      let query = supabase
        .from('lesson_notes')
        .select(`
          id, topic, content_summary, teacher_id, teacher_name, 
          subject_id, class_arm_combo_id, lesson_date, file_name, 
          file_path, status, submitted_at, reviewed_by, reviewed_at, 
          reviewer_comments, created_at
        `)
        .eq('school_id', currentUser.school_id)
        .order('submitted_at', { ascending: false })

      // Apply status filter
      if (filterStatus === 'SUBMITTED') {
        query = query.eq('status', 'SUBMITTED')
      } else if (filterStatus === 'REVIEWED') {
        query = query.neq('status', 'SUBMITTED')
      }

      const { data: notesData, error: notesError } = await query

      if (notesError) {
        console.error('[LessonNotesReview] Notes error:', notesError)
        setError('Failed to load lesson notes')
        return
      }

      // Enrich with subject and class names
      const enrichedNotes = await Promise.all(
        (notesData || []).map(async (note: any) => {
          let subjectName = 'Subject'
          let className = 'Class'

          // Get subject name
          if (note.subject_id) {
            const { data: subjectData } = await supabase
              .from('subjects')
              .select('name')
              .eq('id', note.subject_id)
              .single()
            subjectName = subjectData?.name || 'Subject'
          }

          // Get class name
          if (note.class_arm_combo_id) {
            const { data: classData } = await supabase
              .from('class_arm_combos')
              .select(`
                id,
                classes(name),
                arms(name)
              `)
              .eq('id', note.class_arm_combo_id)
              .single()
            
            const className_val = classData?.classes?.name || 'Class'
            const armName = classData?.arms?.name || ''
            className = armName ? `${className_val} ${armName}` : className_val
          }

          return {
            id: note.id,
            topic: note.topic,
            content_summary: note.content_summary,
            teacher_name: note.teacher_name || 'Unknown Teacher',
            subject_name: subjectName,
            class_name: className,
            lesson_date: note.lesson_date,
            file_name: note.file_name,
            file_path: note.file_path,
            status: note.status || 'SUBMITTED',
            submitted_at: note.submitted_at,
            reviewed_by: note.reviewed_by,
            reviewed_at: note.reviewed_at,
            reviewer_comments: note.reviewer_comments,
          }
        })
      )

      setLessonNotes(enrichedNotes)
      console.log('[LessonNotesReview] Loaded', enrichedNotes.length, 'lesson notes')
    } catch (err: any) {
      console.error('[LessonNotesReview] Error:', err)
      setError(err.message || 'Failed to load lesson notes')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveNote = async () => {
    if (!selectedNote) return

    setReviewing(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase
        .from('lesson_notes')
        .update({
          status: 'APPROVED',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          reviewer_comments: reviewComments || null,
        })
        .eq('id', selectedNote.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Lesson note approved successfully!')
      setReviewComments('')
      
      // Reload notes
      setTimeout(() => {
        loadLessonNotes()
        setSelectedNote(null)
      }, 1000)
    } catch (err: any) {
      console.error('[LessonNotesReview] Approval error:', err)
      setError(err.message || 'Failed to approve lesson note')
    } finally {
      setReviewing(false)
    }
  }

  const handleRejectNote = async () => {
    if (!selectedNote) return

    if (!reviewComments.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setReviewing(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase
        .from('lesson_notes')
        .update({
          status: 'REJECTED',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          reviewer_comments: reviewComments,
        })
        .eq('id', selectedNote.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Lesson note rejected. Teacher has been notified.')
      setReviewComments('')

      // Reload notes
      setTimeout(() => {
        loadLessonNotes()
        setSelectedNote(null)
      }, 1000)
    } catch (err: any) {
      console.error('[LessonNotesReview] Rejection error:', err)
      setError(err.message || 'Failed to reject lesson note')
    } finally {
      setReviewing(false)
    }
  }

  const downloadFile = (filePath: string, fileName: string) => {
    if (!filePath) return

    // In a real implementation, you would get a signed URL and download
    // For now, just log the action
    console.log('Download:', filePath, fileName)
    alert(`File download feature coming soon.\n\nFile: ${fileName}\nPath: ${filePath}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <StaffHeader
          staffName="Loading..."
          schoolName="School"
          section="Lesson Notes Review"
        />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-pink-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <StaffHeader
        staffName={context?.full_name || 'Headteacher'}
        schoolName={context?.school_id || 'School'}
        section="Lesson Notes Review"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">📋 Lesson Notes Review</h1>
          <p className="text-gray-600 mt-1">Review and approve lesson notes from teachers</p>
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

        {/* Filter Buttons */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Notes ({lessonNotes.length})
          </button>
          <button
            onClick={() => setFilterStatus('SUBMITTED')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === 'SUBMITTED'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Pending Review ({lessonNotes.filter(n => n.status === 'SUBMITTED').length})
          </button>
          <button
            onClick={() => setFilterStatus('REVIEWED')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterStatus === 'REVIEWED'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Reviewed ({lessonNotes.filter(n => n.status !== 'SUBMITTED').length})
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson Notes List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4">
                <h2 className="text-xl font-bold">Submitted Notes</h2>
              </div>
              {lessonNotes.length === 0 ? (
                <div className="p-6 text-center text-gray-600">
                  <p>No lesson notes to review</p>
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {lessonNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                        selectedNote?.id === note.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <h3 className="font-bold text-gray-900 text-sm">{note.topic}</h3>
                      <p className="text-xs text-gray-600 mt-1">👨‍🏫 {note.teacher_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        📚 {note.subject_name} • 🏫 {note.class_name}
                      </p>
                      {note.file_name && (
                        <p className="text-xs text-blue-600 mt-1">📎 Has file</p>
                      )}
                      <div className="mt-2">
                        {note.status === 'SUBMITTED' ? (
                          <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                            ⏳ Pending
                          </span>
                        ) : note.status === 'APPROVED' ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                            ✗ Rejected
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-2">
            {selectedNote ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 text-white px-6 py-4">
                  <h2 className="text-2xl font-bold">{selectedNote.topic}</h2>
                  <p className="text-sm text-blue-100 mt-2">
                    👨‍🏫 {selectedNote.teacher_name} • 📚 {selectedNote.subject_name} • 🏫 {selectedNote.class_name}
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Lesson Content */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Lesson Content</h3>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">
                        {selectedNote.content_summary}
                      </p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    {selectedNote.lesson_date && (
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">Lesson Date</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(selectedNote.lesson_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Submitted</p>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(selectedNote.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* File Section */}
                  {selectedNote.file_name && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">📎 Attached File</p>
                      <p className="text-sm text-gray-700 mb-3">{selectedNote.file_name}</p>
                      <button
                        onClick={() => downloadFile(selectedNote.file_path || '', selectedNote.file_name || '')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                      >
                        📥 Download File
                      </button>
                    </div>
                  )}

                  {/* Review Section */}
                  {selectedNote.status === 'SUBMITTED' ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                      <p className="text-sm font-semibold text-gray-900">Review & Approval</p>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Comments (Optional)
                        </label>
                        <textarea
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          placeholder="Add any feedback or comments for the teacher..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                        ></textarea>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleApproveNote}
                          disabled={reviewing}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded transition-colors"
                        >
                          {reviewing ? '⏳ Processing...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={handleRejectNote}
                          disabled={reviewing}
                          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded transition-colors"
                        >
                          {reviewing ? '⏳ Processing...' : '✗ Reject'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-lg p-4 ${
                      selectedNote.status === 'APPROVED'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        {selectedNote.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                      </p>
                      {selectedNote.reviewed_at && (
                        <p className="text-xs text-gray-600 mb-2">
                          {new Date(selectedNote.reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                      {selectedNote.reviewer_comments && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Comments:</p>
                          <p className="text-sm text-gray-700">{selectedNote.reviewer_comments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
                <p className="text-lg">👈 Select a lesson note to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
