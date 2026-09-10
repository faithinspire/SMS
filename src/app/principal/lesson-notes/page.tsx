'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'

interface LessonNote {
  id: string
  teacher_name: string
  lesson_date: string
  topic: string
  subject_name: string
  class_name: string
  file_name: string
  file_path: string
  status: string
  submitted_at: string
  reviewer_feedback?: string
  approval_status?: string
  content_summary?: string
}

export default function PrincipalLessonNotesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([])
  const [selectedNote, setSelectedNote] = useState<LessonNote | null>(null)
  const [filterStatus, setFilterStatus] = useState('SUBMITTED')
  const [feedback, setFeedback] = useState('')
  const [approvalStatus, setApprovalStatus] = useState<'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'>('APPROVED')
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadLessonNotes()
  }, [filterStatus])

  const loadLessonNotes = async () => {
    try {
      setLoading(true)
      setError('')

      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser || (currentUser.role !== 'PRINCIPAL' && currentUser.role !== 'HEAD_TEACHER')) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load school
      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      setSchool(schoolData)

      // Load lesson notes
      let query = supabase
        .from('lesson_notes')
        .select(`
          id, teacher_name, lesson_date, topic, file_name, file_path, status,
          submitted_at, reviewer_feedback, approval_status, content_summary,
          subjects(name),
          class_arm_combos(name)
        `)
        .eq('school_id', currentUser.school_id)

      if (filterStatus !== 'ALL') {
        query = query.eq('status', filterStatus)
      }

      const { data: notesData } = await query.order('submitted_at', { ascending: false })

      const formattedNotes = (notesData || []).map((note: any) => ({
        id: note.id,
        teacher_name: note.teacher_name,
        lesson_date: note.lesson_date,
        topic: note.topic,
        subject_name: note.subjects?.name || 'Unknown',
        class_name: note.class_arm_combos?.name || 'Unknown',
        file_name: note.file_name,
        file_path: note.file_path,
        status: note.status,
        submitted_at: note.submitted_at,
        reviewer_feedback: note.reviewer_feedback,
        approval_status: note.approval_status,
        content_summary: note.content_summary,
      }))

      setLessonNotes(formattedNotes)
      console.log('[PrincipalLessonNotes] Loaded:', formattedNotes.length, 'notes')
    } catch (err: any) {
      console.error('[PrincipalLessonNotes] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = (filePath: string, fileName: string) => {
    if (!filePath) return

    // For Supabase storage, construct the public URL
    const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${filePath}`
    const link = document.createElement('a')
    link.href = storageUrl
    link.download = fileName || 'lesson-note'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleApproveNote = async () => {
    if (!selectedNote || !feedback.trim()) {
      setError('❌ Please enter feedback')
      return
    }

    try {
      setReviewing(true)
      setError('')

      // Update lesson note
      const { error: updateErr } = await supabase
        .from('lesson_notes')
        .update({
          status: approvalStatus === 'APPROVED' ? 'APPROVED' : approvalStatus === 'REJECTED' ? 'SUBMITTED' : 'NEEDS_REVISION',
          reviewer_feedback: feedback,
          approval_status: approvalStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          reviewer_name: user?.full_name,
        })
        .eq('id', selectedNote.id)

      if (updateErr) throw updateErr

      // Create approval record for audit trail
      const { error: auditErr } = await supabase
        .from('lesson_note_approvals')
        .insert([
          {
            lesson_note_id: selectedNote.id,
            school_id: user?.school_id,
            reviewed_by: user?.id,
            reviewer_name: user?.full_name,
            reviewer_role: user?.role,
            approval_status: approvalStatus,
            feedback,
            approved_at: new Date().toISOString(),
          },
        ])

      if (auditErr) throw auditErr

      setSuccess(`✅ Lesson note marked as ${approvalStatus}!`)
      setFeedback('')
      setSelectedNote(null)

      // Reload notes
      await loadLessonNotes()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('[PrincipalLessonNotes] Approve error:', err)
      setError(err.message)
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700">Loading lesson notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 pb-24">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">📚 Lesson Notes Review</h1>
          <p className="text-gray-600 mt-2">{school?.name}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
            {success}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['SUBMITTED', 'NEEDS_REVISION', 'APPROVED', 'ALL'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-amber-300'
              }`}
            >
              {status === 'SUBMITTED' && '📥 Pending'}
              {status === 'NEEDS_REVISION' && '⚠️ Revision'}
              {status === 'APPROVED' && '✅ Approved'}
              {status === 'ALL' && '📋 All'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson Notes List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-amber-50 border-b">
                <h2 className="text-lg font-bold text-gray-900">
                  📬 Lesson Notes ({lessonNotes.length})
                </h2>
              </div>

              <div className="max-h-[calc(100vh-300px)] overflow-y-auto divide-y">
                {lessonNotes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No lesson notes found
                  </div>
                ) : (
                  lessonNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedNote?.id === note.id
                          ? 'bg-amber-50 border-l-4 border-amber-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-900">{note.topic}</p>
                          <p className="text-sm text-gray-600">👨‍🏫 {note.teacher_name}</p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            note.status === 'APPROVED'
                              ? 'bg-green-100 text-green-700'
                              : note.status === 'NEEDS_REVISION'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {note.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>📖 {note.subject_name}</span>
                        <span>🎓 {note.class_name}</span>
                        <span>📅 {new Date(note.lesson_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Review Panel */}
          {selectedNote && (
            <div className="bg-white rounded-lg shadow-lg p-6 h-fit sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Review Note</h3>

              <div className="space-y-4">
                <div>
                  <p className="font-bold text-gray-900">{selectedNote.topic}</p>
                  <p className="text-sm text-gray-600">By: {selectedNote.teacher_name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    📚 {selectedNote.subject_name} • 🎓 {selectedNote.class_name}
                  </p>
                </div>

                {/* Summary */}
                {selectedNote.content_summary && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Summary:</p>
                    <p className="text-sm text-gray-600">{selectedNote.content_summary}</p>
                  </div>
                )}

                {/* Download File */}
                {selectedNote.file_name && (
                  <button
                    onClick={() => downloadFile(selectedNote.file_path, selectedNote.file_name)}
                    className="w-full px-4 py-2 border border-blue-500 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all text-sm"
                  >
                    📥 Download: {selectedNote.file_name}
                  </button>
                )}

                {/* Approval Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Action:
                  </label>
                  <select
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="APPROVED">✅ Approve</option>
                    <option value="NEEDS_REVISION">⚠️ Needs Revision</option>
                    <option value="REJECTED">❌ Reject</option>
                  </select>
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Feedback:
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback for the teacher..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleApproveNote}
                  disabled={reviewing}
                  className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 disabled:opacity-50 transition-all"
                >
                  {reviewing ? '⏳ Submitting...' : '✓ Submit Review'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
