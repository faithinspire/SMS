/**
 * LessonNoteService - Wraps API routes for lesson note operations
 * All methods now call backend API routes instead of direct Supabase calls.
 * This provides a clean service layer with centralized error handling and validation.
 */

export interface LessonNote {
  id: string
  school_id: string
  subject_id: string
  class_arm_combo_id: string
  created_by: string
  title: string
  content?: string
  attachments?: any
  published_at?: string
  created_at: string
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'RETURNED'
  reviewed_by?: string
  reviewed_at?: string
  reviewer_comments?: string
}

export interface LessonNoteWithTeacher extends LessonNote {
  teacher_name?: string
  subject_name?: string
  class_name?: string
}

export class LessonNoteService {
  private static readonly BASE_URL = '/api'

  /**
   * Submit a new lesson note from teacher
   */
  static async submitLessonNote(payload: {
    title: string
    content: string
    subject_id: string
    class_arm_combo_id: string
    attachments?: any
  }): Promise<LessonNote> {
    try {
      const response = await fetch(`${this.BASE_URL}/teacher/lessons/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit lesson note')
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting lesson note:', error)
      throw error
    }
  }

  /**
   * Get all pending lesson notes for principal review
   */
  static async getPendingLessonNotes(schoolId: string, principalId: string): Promise<LessonNoteWithTeacher[]> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('principal_id', principalId)

      const response = await fetch(`${this.BASE_URL}/principal/lessons/pending?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorText = await response.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { message: errorText }
        }
        throw new Error(error.message || 'Failed to fetch pending lesson notes')
      }

      const data = await response.json()
      return data.lesson_notes || data
    } catch (error) {
      console.error('Error fetching pending lesson notes:', error)
      throw error
    }
  }

  /**
   * Get all lesson notes for a school with teacher/subject/class details
   */
  static async getLessonNotesBySchool(
    schoolId: string,
    principalId?: string,
    status?: string,
    limit: number = 50
  ): Promise<LessonNoteWithTeacher[]> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      if (principalId) params.append('principal_id', principalId)
      if (status) params.append('status', status)
      if (limit) params.append('limit', limit.toString())

      const response = await fetch(
        `${this.BASE_URL}/principal/lessons/pending?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { message: errorText }
        }
        throw new Error(error.message || 'Failed to fetch lesson notes')
      }

      const data = await response.json()
      return data.lesson_notes || data
    } catch (error) {
      console.error('Error fetching lesson notes by school:', error)
      throw error
    }
  }

  /**
   * Get lesson notes by status for principal review
   */
  static async getLessonNotesByStatus(
    schoolId: string,
    principalId: string,
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'RETURNED'
  ): Promise<LessonNoteWithTeacher[]> {
    return this.getLessonNotesBySchool(schoolId, principalId, status)
  }

  /**
   * Get lesson notes by teacher (retrieve from pending endpoint with teacher filter)
   */
  static async getLessonNotesByTeacher(
    schoolId: string,
    principalId: string,
    teacherId: string
  ): Promise<LessonNote[]> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('principal_id', principalId)

      const response = await fetch(`${this.BASE_URL}/principal/lessons/pending?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorText = await response.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { message: errorText }
        }
        throw new Error(error.message || 'Failed to fetch lesson notes')
      }

      const data = await response.json()
      const allNotes = data.lesson_notes || data
      return allNotes.filter((note: any) => note.created_by === teacherId)
    } catch (error) {
      console.error('Error fetching lesson notes by teacher:', error)
      throw error
    }
  }

  /**
   * Approve a lesson note
   */
  static async approveLessonNote(
    noteId: string,
    principalId: string,
    comments?: string
  ): Promise<LessonNote> {
    try {
      const response = await fetch(`${this.BASE_URL}/principal/lessons/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_note_id: noteId,
          principal_id: principalId,
          review_comments: comments,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { message: errorText }
        }
        throw new Error(error.message || 'Failed to approve lesson note')
      }

      return await response.json()
    } catch (error) {
      console.error('Error approving lesson note:', error)
      throw error
    }
  }

  /**
   * Return a lesson note for revision
   */
  static async returnLessonNote(
    noteId: string,
    principalId: string,
    comments: string
  ): Promise<LessonNote> {
    try {
      const response = await fetch(`${this.BASE_URL}/principal/lessons/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_note_id: noteId,
          principal_id: principalId,
          review_comments: comments,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { message: errorText }
        }
        throw new Error(error.message || 'Failed to return lesson note')
      }

      return await response.json()
    } catch (error) {
      console.error('Error returning lesson note:', error)
      throw error
    }
  }

  /**
   * Mark lesson note as under review (deprecated - use API directly if needed)
   */
  static async markAsUnderReview(
    noteId: string,
    principalId: string
  ): Promise<LessonNote> {
    // This is handled internally by the approve/return endpoints
    // Kept for backward compatibility
    throw new Error('Use approveLessonNote or returnLessonNote instead')
  }

  /**
   * Get statistics for lesson notes
   */
  static async getLessonNoteStats(schoolId: string, principalId: string): Promise<{
    total: number
    submitted: number
    underReview: number
    approved: number
    returned: number
  }> {
    try {
      const pendingNotes = await this.getPendingLessonNotes(schoolId, principalId)

      return {
        total: pendingNotes.length,
        submitted: pendingNotes.filter((n: any) => n.status === 'SUBMITTED').length,
        underReview: pendingNotes.filter((n: any) => n.status === 'UNDER_REVIEW').length,
        approved: pendingNotes.filter((n: any) => n.status === 'APPROVED').length,
        returned: pendingNotes.filter((n: any) => n.status === 'RETURNED').length,
      }
    } catch (error) {
      console.error('Error getting lesson note stats:', error)
      throw error
    }
  }
}
