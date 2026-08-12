import { supabase } from '@/lib/supabase-client'

export interface CBTExam {
  id: string
  schoolId: string
  subjectId: string
  classArmComboId: string
  createdBy: string
  title: string
  description: string
  startTime: string
  endTime: string
  durationMinutes: number
  totalMarks?: number
  passingPercentage?: number
  createdAt: string
}

export interface CBTQuestion {
  id: string
  examId: string
  questionText: string
  questionType: 'MCQ' | 'TRUE_FALSE' | 'ESSAY'
  marks: number
  options?: Array<{ text: string; isCorrect: boolean }>
  correctAnswer?: string
  createdAt: string
}

export interface CBTSubmission {
  id: string
  examId: string
  studentId: string
  startedAt: string
  submittedAt?: string
  score?: number
  totalMarks?: number
  percentage?: number
  passed?: boolean
}

export class CBTService {
  static async createExam(data: Omit<CBTExam, 'id' | 'createdAt'>): Promise<CBTExam> {
    const { data: exam, error } = await supabase
      .from('cbt_exams')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return exam
  }

  static async addQuestion(data: Omit<CBTQuestion, 'id' | 'createdAt'>): Promise<CBTQuestion> {
    const { data: question, error } = await supabase
      .from('cbt_questions')
      .insert({ ...data, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return question
  }

  static async getExamQuestions(examId: string): Promise<CBTQuestion[]> {
    const { data, error } = await supabase
      .from('cbt_questions')
      .select('*')
      .eq('cbt_exam_id', examId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async startExam(examId: string, studentId: string): Promise<CBTSubmission> {
    const { data, error } = await supabase
      .from('cbt_submissions')
      .insert({
        cbt_exam_id: examId,
        student_id: studentId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async submitAnswer(submissionId: string, questionId: string, answer: string): Promise<void> {
    const { error } = await supabase.from('cbt_answers').insert({
      submission_id: submissionId,
      question_id: questionId,
      answer_text: answer,
      created_at: new Date().toISOString(),
    })

    if (error) throw error
  }

  static async submitExam(submissionId: string): Promise<CBTSubmission> {
    const { data, error } = await supabase
      .from('cbt_submissions')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', submissionId)
      .select()
      .single()

    if (error) throw error

    // Auto-grade MCQ
    await this.autoGradeExam(submissionId)

    return data
  }

  private static async autoGradeExam(submissionId: string): Promise<void> {
    const { data: submission } = await supabase
      .from('cbt_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (!submission) return

    const { data: answers } = await supabase
      .from('cbt_answers')
      .select('*, cbt_questions(*)')
      .eq('submission_id', submissionId)

    if (!answers) return

    let totalScore = 0
    for (const answer of answers) {
      const question = answer.cbt_questions
      if (question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE') {
        if (answer.answer_text === question.correct_answer) {
          totalScore += question.marks
        }
      }
    }

    const { data: exam } = await supabase
      .from('cbt_exams')
      .select('*')
      .eq('id', submission.cbt_exam_id)
      .single()

    const percentage = exam ? (totalScore / exam.total_marks) * 100 : 0
    const passed = exam ? percentage >= exam.passing_percentage : false

    await supabase
      .from('cbt_submissions')
      .update({ score: totalScore, percentage, passed })
      .eq('id', submissionId)
  }

  static async getExamsForTeacher(schoolId: string, subjectId: string, classArmComboId: string): Promise<CBTExam[]> {
    const { data, error } = await supabase
      .from('cbt_exams')
      .select('*')
      .eq('school_id', schoolId)
      .eq('subject_id', subjectId)
      .eq('class_arm_combo_id', classArmComboId)
      .order('start_time', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async getExamsForStudent(studentId: string, schoolId: string): Promise<CBTExam[]> {
    const { data: subjectTeachers } = await supabase
      .from('student_subject_teachers')
      .select('subject_id')
      .eq('student_id', studentId)

    const subjectIds = subjectTeachers?.map((st) => st.subject_id) || []

    const { data, error } = await supabase
      .from('cbt_exams')
      .select('*')
      .eq('school_id', schoolId)
      .in('subject_id', subjectIds)
      .order('start_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async getSubmissionWithScores(submissionId: string): Promise<any> {
    const { data: submission } = await supabase
      .from('cbt_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    const { data: answers } = await supabase
      .from('cbt_answers')
      .select('*, cbt_questions(*)')
      .eq('submission_id', submissionId)

    return { submission, answers: answers || [] }
  }
}
