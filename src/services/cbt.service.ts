/**
 * CBTService - Wraps API routes for CBT exam operations
 * All methods now call backend API routes instead of direct Supabase calls.
 * 
 * Key Features:
 * - Auto-grading via database trigger
 * - Selected option validation (option_key: A,B,C,D)
 * - Automatic score sheet updates on submission
 * - Multi-step workflow: create → add questions → start → submit
 */

export interface CBTExam {
  id: string
  school_id: string
  subject_id: string
  class_arm_combo_id: string
  created_by: string
  title: string
  description?: string
  duration_minutes: number
  total_marks: number
  passing_percentage?: number
  assessment_type: string
  term_id: string
  created_at: string
}

export interface CBTQuestion {
  id: string
  cbt_exam_id: string
  question_text: string
  question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY'
  marks: number
  created_at: string
}

export interface CBTOption {
  id: string
  question_id: string
  option_key: 'A' | 'B' | 'C' | 'D'
  option_text: string
  is_correct: boolean
}

export interface CBTSubmission {
  id: string
  cbt_exam_id: string
  student_id: string
  status: 'STARTED' | 'SUBMITTED' | 'GRADED' | 'LOCKED'
  started_at: string
  submitted_at?: string
  score?: number
  total_marks: number
  percentage?: number
  passed?: boolean
  graded_at?: string
}

export class CBTService {
  private static readonly BASE_URL = '/api'

  /**
   * Create a new CBT exam (Teacher)
   */
  static async createExam(payload: {
    school_id: string
    subject_id: string
    class_arm_combo_id: string
    teacher_id: string
    title: string
    description?: string
    assessment_type: 'CA1' | 'CA2' | 'CA3' | 'CA4' | 'MIDTERM' | 'EXAM'
    term_id: string
    duration_minutes: number
    total_marks: number
    passing_percentage?: number
  }): Promise<CBTExam> {
    try {
      const response = await fetch(`${this.BASE_URL}/teacher/cbt/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to create exam')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating CBT exam:', error)
      throw error
    }
  }

  /**
   * Add questions and options to an exam (Teacher)
   */
  static async addQuestions(payload: {
    school_id: string
    exam_id: string
    questions: Array<{
      question_text: string
      question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY'
      marks: number
      options?: Array<{
        option_key: 'A' | 'B' | 'C' | 'D'
        option_text: string
        is_correct: boolean
      }>
    }>
  }): Promise<{ success: boolean; questions_created: number }> {
    try {
      const response = await fetch(`${this.BASE_URL}/teacher/cbt/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to add questions')
      }

      return await response.json()
    } catch (error) {
      console.error('Error adding CBT questions:', error)
      throw error
    }
  }

  /**
   * Get available exams for student
   */
  static async getExamsForStudent(
    schoolId: string,
    studentId: string
  ): Promise<CBTExam[]> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('student_id', studentId)

      const response = await fetch(
        `${this.BASE_URL}/student/cbt/exams?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to fetch exams')
      }

      const data = await response.json()
      return data.exams || []
    } catch (error) {
      console.error('Error fetching exams for student:', error)
      throw error
    }
  }

  /**
   * Start a CBT exam (Student)
   */
  static async startExam(
    schoolId: string,
    examId: string,
    studentId: string
  ): Promise<{
    success: boolean
    submission_id: string
    submission: CBTSubmission
  }> {
    try {
      const response = await fetch(`${this.BASE_URL}/student/cbt/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          exam_id: examId,
          student_id: studentId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to start exam')
      }

      return await response.json()
    } catch (error) {
      console.error('Error starting CBT exam:', error)
      throw error
    }
  }

  /**
   * Save an answer to a question (Student)
   */
  static async submitAnswer(payload: {
    school_id: string
    submission_id: string
    question_id: string
    selected_option_id?: string
    answer_text?: string
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.BASE_URL}/student/cbt/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to save answer')
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting answer:', error)
      throw error
    }
  }

  /**
   * Submit completed exam for grading (Student)
   * This triggers auto-grading and score sheet update
   */
  static async submitExam(payload: {
    school_id: string
    submission_id: string
    student_id: string
  }): Promise<{
    success: boolean
    result: {
      score: number
      total_marks: number
      percentage: number
      passed: boolean
      status: string
      submitted_at: string
      message: string
    }
  }> {
    try {
      const response = await fetch(`${this.BASE_URL}/student/cbt/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to submit exam')
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting exam:', error)
      throw error
    }
  }

  /**
   * Get exam questions and options (Teacher or Student)
   */
  static async getExamQuestions(
    schoolId: string,
    examId: string
  ): Promise<(CBTQuestion & { options: CBTOption[] })[]> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('exam_id', examId)

      const response = await fetch(
        `${this.BASE_URL}/teacher/cbt/questions?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to fetch questions')
      }

      const data = await response.json()
      return data.questions || []
    } catch (error) {
      console.error('Error fetching exam questions:', error)
      throw error
    }
  }

  /**
   * Get teacher's exams
   */
  static async getExamsForTeacher(
    schoolId: string,
    teacherId: string
  ): Promise<CBTExam[]> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('teacher_id', teacherId)

      const response = await fetch(
        `${this.BASE_URL}/teacher/cbt/list?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to fetch exams')
      }

      const data = await response.json()
      return data.exams || []
    } catch (error) {
      console.error('Error fetching exams for teacher:', error)
      throw error
    }
  }
}
