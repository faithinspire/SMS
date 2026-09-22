'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'
import toast from 'react-hot-toast'

interface LessonNote {
  id: string
  title: string
  content: string
  status: string
  created_at: string
  teacher: {
    id: string
    full_name: string
    email: string
  }
  subject: {
    id: string
    name: string
    code: string
  }
  class_arm: {
    class_name: string
    arm_name: string
  }
  attachments: Array<{ name: string; path: string; size?: number }>
}

export default function PrincipalLessonNotesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([])
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RETURNED'>('ALL')
  const [selectedNote, setSelectedNote] = useState<LessonNote | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [submittingApproval, setSubmittingApproval] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role)) {
        toast.error('Unauthorized access')
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load school
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', currentUser.school_id)
        .single()

      setSchool(schoolData)

      // Load pending lesson notes
      const response = await fetch(
        `/api/principal/lessons/pending?school_id=${currentUser.school_id}&principal_id=${currentUser.id}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load lesson notes')
      }

      const data = await response.json()
      setLessonNotes(data.lesson_notes || [])
    } catch (error) {
      console.error('Error loading lesson notes:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load lesson notes')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (noteId: string) => {
    try {
      setSubmittingApproval(true)

      const response = await fetch(`/api/principal/lessons/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_note_id: noteId,
          principal_id: user.id,
          school_id: user.school_id,
          feedback: approvalComment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve lesson note')
      }

      toast.success('Lesson note approved')
      setSelectedNote(null)
      setApprovalComment('')
      loadData()
    } catch (error) {
      console.error('Error approving lesson note:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to approve')
    } finally {
      setSubmittingApproval(false)
    }
  }

  const handleReturn = async (noteId: string) => {
    try {
      setSubmittingApproval(true)

      const response = await fetch(`/api/principal/lessons/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_note_id: noteId,
          principal_id: user.id,
          school_id: user.school_id,
          feedback: approvalComment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to return lesson note')
      }

      toast.success('Lesson note returned for revision')
      setSelectedNote(null)
      setApprovalComment('')
      loadData()
    } catch (error) {
      console.error('Error returning lesson note:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to return')
    } finally {
      setSubmittingApproval(false)
    }
  }

  const filtered = filterStatus === 'ALL' ? lessonNotes : lessonNotes.filter(n => n.status === filterStatus)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading lesson notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      <StaffHeader
        staffName={user?.full_name || 'Principal'}
        schoolName={school?.name || 'School'}
        section="Lesson Notes Review"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Section */}
        <div className="mb-6 flex gap-2">
          {(['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Lesson Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 text-lg">No pending lesson notes to review</p>
            </div>
          ) : (
            filtered.map(note => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-5 hover:border-purple-500/50 transition cursor-pointer"
              >
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-white mb-1">{note.title}</h3>
                  <p className="text-sm text-gray-400">{note.teacher.full_name}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Subject:</span>
                    <span className="text-purple-300">{note.subject.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Class:</span>
                    <span className="text-purple-300">
                      {note.class_arm.class_name} {note.class_arm.arm_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Status:</span>
                    <span
                      className={`px-2 py-1 rounded font-semibold ${
                        note.status === 'SUBMITTED'
                          ? 'bg-blue-900/50 text-blue-300'
                          : note.status === 'UNDER_REVIEW'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}
                    >
                      {note.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-400 line-clamp-2 mb-3">{note.content}</p>

                <div className="text-xs text-gray-500">
                  {new Date(note.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 border border-slate-700">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{selectedNote.title}</h2>
                <p className="text-gray-400">
                  By: <span className="text-purple-300">{selectedNote.teacher.full_name}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 mb-1">Subject</p>
                <p className="text-white font-semibold">{selectedNote.subject.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Class</p>
                <p className="text-white font-semibold">
                  {selectedNote.class_arm.class_name} {selectedNote.class_arm.arm_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="text-white font-semibold">{selectedNote.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Submitted</p>
                <p className="text-white font-semibold">{new Date(selectedNote.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3">Content</h3>
              <div className="bg-slate-700/50 rounded-lg p-4 text-gray-300 whitespace-pre-wrap">{selectedNote.content}</div>
            </div>

            {selectedNote.attachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3">Attachments</h3>
                <div className="space-y-2">
                  {selectedNote.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-slate-700/50 rounded-lg text-purple-300 hover:text-purple-200 transition"
                    >
                      📎 {att.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-2">Feedback/Comments</label>
              <textarea
                value={approvalComment}
                onChange={e => setApprovalComment(e.target.value)}
                placeholder="Add feedback for the teacher (optional)"
                rows={4}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedNote.id)}
                disabled={submittingApproval}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
              >
                {submittingApproval ? '⏳ Processing...' : '✅ Approve'}
              </button>
              <button
                onClick={() => handleReturn(selectedNote.id)}
                disabled={submittingApproval}
                className="flex-1 px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition"
              >
                {submittingApproval ? '⏳ Processing...' : '↩️ Return'}
              </button>
              <button
                onClick={() => setSelectedNote(null)}
                className="px-6 py-3 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
