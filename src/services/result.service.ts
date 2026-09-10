/**
 * ResultService - Wraps API routes for score sheet operations
 * All methods now call backend API routes instead of direct Supabase calls
 * 
 * Single source of truth: score_sheets table (canonical)
 * Supports manual entry, CBT auto-grading, and score sheet management
 */

export interface StudentScore {
  id?: string
  schoolId: string
  studentId: string
  subjectId: string
  termId: string
  classArmComboId: string
  test1?: number
  test2?: number
  test3?: number
  test4?: number
  exam?: number
  total?: number
  grade?: string
  createdAt?: string
  updatedAt?: string
}

export interface ScoreSheetResponse {
  success: boolean
  message: string
  score_sheet: any
}

export class ResultService {
  private static readonly BASE_URL = '/api'

  /**
   * Save or update a score sheet (MANUAL entry)
   */
  static async saveScoreSheet(payload: {
    school_id: string
    student_id: string
    subject_id: string
    term_id?: string
    class_arm_combo_id: string
    teacher_id: string
    test1_score?: number
    test2_score?: number
    test3_score?: number
    test4_score?: number
    exam_score?: number
    teacher_comment?: string
  }): Promise<ScoreSheetResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/subject-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to save score sheet')
      }

      return await response.json()
    } catch (error) {
      console.error('Error saving score sheet:', error)
      throw error
    }
  }

  /**
   * Get score sheets for a subject/class/term
   */
  static async getScoreSheets(
    classArmComboId: string,
    subjectId: string,
    termId: string,
    schoolId: string
  ): Promise<StudentScore[]> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('class_arm_combo_id', classArmComboId)
      params.append('subject_id', subjectId)
      params.append('term_id', termId)

      const response = await fetch(
        `${this.BASE_URL}/results/score-sheets?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to fetch score sheets')
      }

      const data = await response.json()
      return (data.score_sheets || []).map((item: any) => ({
        id: item.id,
        schoolId: item.school_id,
        studentId: item.student_id,
        subjectId: item.subject_id,
        termId: item.term_id,
        classArmComboId: item.class_arm_combo_id,
        test1: item.test1,
        test2: item.test2,
        test3: item.test3,
        test4: item.test4,
        exam: item.exam,
        total: item.total,
        grade: item.grade,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }))
    } catch (error) {
      console.error('Error fetching score sheets:', error)
      return []
    }
  }

  /**
   * Update comment on a score sheet
   */
  static async updateComment(payload: {
    school_id: string
    score_sheet_id: string
    comment: string
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.BASE_URL}/results/update-comment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to update comment')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating comment:', error)
      throw error
    }
  }

  /**
   * Validate scores before saving
   */
  static async validateScores(payload: {
    test1?: number
    test2?: number
    test3?: number
    test4?: number
    exam?: number
  }): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const errors: string[] = []

      if (payload.test1 !== undefined && (payload.test1 < 0 || payload.test1 > 10)) {
        errors.push('Test 1 must be 0-10')
      }
      if (payload.test2 !== undefined && (payload.test2 < 0 || payload.test2 > 10)) {
        errors.push('Test 2 must be 0-10')
      }
      if (payload.test3 !== undefined && (payload.test3 < 0 || payload.test3 > 10)) {
        errors.push('Test 3 must be 0-10')
      }
      if (payload.test4 !== undefined && (payload.test4 < 0 || payload.test4 > 10)) {
        errors.push('Test 4 must be 0-10')
      }
      if (payload.exam !== undefined && (payload.exam < 0 || payload.exam > 60)) {
        errors.push('Exam must be 0-60')
      }

      return {
        valid: errors.length === 0,
        errors,
      }
    } catch (error) {
      console.error('Error validating scores:', error)
      throw error
    }
  }

  /**
   * Calculate total score and grade
   */
  static calculateGrade(test1: number, test2: number, test3: number, test4: number, exam: number) {
    const total = test1 + test2 + test3 + test4 + exam
    let grade = 'F'

    if (total >= 90) grade = 'A'
    else if (total >= 80) grade = 'B'
    else if (total >= 70) grade = 'C'
    else if (total >= 60) grade = 'D'

    return { total, grade }
  }

  /**
   * Sync score sheet (for special migrations or reconciliation)
   */
  static async syncScoreSheet(payload: any): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/results/sync-score-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to sync score sheet')
      }

      return await response.json()
    } catch (error) {
      console.error('Error syncing score sheet:', error)
      throw error
    }
  }
}
