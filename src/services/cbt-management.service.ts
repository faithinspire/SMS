/**
 * CBT Management Service
 * Handles creation, editing, and management of CBT exams
 */

import { supabase } from '@/lib/supabase-client'

export interface CreateCBTExamInput {
  school_id: string
  subject_id: string
  class_arm_combo_id: string
  created_by: string // user_id (teacher)
  term_id: string
  title: string
  description: string
  exam_type: 'TEST' | 'EXAM'
  test_number?: 1 | 2 | 3 | 4 // for TEST type
  total_marks: number
  passing_percentage: number
  duration_minutes: number
  allow_review: boolean
  randomize_questions: boolean
  randomize_options: boolean
  start_time?: string
  end_time?: string
}

export interface CreateQuestionInput {
  cbt_exam_id: string
  school_id: string
  question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY'
  question_text: string
  marks: number
  display_order: number
}

export interface CreateOptionInput {
  question_id: string
  option_text: string
  is_correct: boolean
  option_key?: string // 'A', 'B', 'C', 'D'
  display_order: number
}

export class CBTManagementService {
  /**
   * Create a new CBT exam
   */
  static async createExam(input: CreateCBTExamInput): Promise<string> {
    try {
      console.log(`📝 Creating CBT exam: ${input.title}`)

      const { data, error } = await supabase
        .from('cbt_exams')
        .insert({
          school_id: input.school_id,
          subject_id: input.subject_id,
          class_arm_combo_id: input.class_arm_combo_id,
          created_by: input.created_by,
          term_id: input.term_id,
          title: input.title,
          description: input.description,
          exam_type: input.exam_type,
          test_number: input.test_number || null,
          total_marks: input.total_marks,
          passing_percentage: input.passing_percentage,
          duration_minutes: input.duration_minutes,
          allow_review: input.allow_review,
          randomize_questions: input.randomize_questions,
          randomize_options: input.randomize_options,
          start_time: input.start_time || null,
          end_time: input.end_time || null,
          status: 'DRAFT',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create exam: ${error.message}`)
      }

      const examId = data.id
      console.log(`✅ Exam created: ${examId}`)
      return examId
    } catch (err: any) {
      console.error('❌ Error creating exam:', err)
      throw err
    }
  }

  /**
   * Add question to exam
   */
  static async addQuestion(input: CreateQuestionInput): Promise<string> {
    try {
      console.log(`❓ Adding question to exam...`)

      const { data, error } = await supabase
        .from('cbt_questions')
        .insert({
          cbt_exam_id: input.cbt_exam_id,
          school_id: input.school_id,
          question_type: input.question_type,
          question_text: input.question_text,
          marks: input.marks,
          display_order: input.display_order,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create question: ${error.message}`)
      }

      console.log(`✅ Question created: ${data.id}`)
      return data.id
    } catch (err: any) {
      console.error('❌ Error adding question:', err)
      throw err
    }
  }

  /**
   * Add option to question
   */
  static async addOption(input: CreateOptionInput): Promise<string> {
    try {
      console.log(`🔤 Adding option to question...`)

      // If this is the correct answer, ensure no other option is marked correct
      if (input.is_correct) {
        const { data: existingCorrect } = await supabase
          .from('cbt_options')
          .select('id')
          .eq('question_id', input.question_id)
          .eq('is_correct', true)

        if (existingCorrect && existingCorrect.length > 0) {
          // Update existing correct option to false
          await supabase
            .from('cbt_options')
            .update({ is_correct: false })
            .eq('question_id', input.question_id)
            .eq('is_correct', true)
        }
      }

      const { data, error } = await supabase
        .from('cbt_options')
        .insert({
          question_id: input.question_id,
          option_text: input.option_text,
          is_correct: input.is_correct,
          option_key: input.option_key || null,
          display_order: input.display_order,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create option: ${error.message}`)
      }

      console.log(`✅ Option created: ${data.id}`)
      return data.id
    } catch (err: any) {
      console.error('❌ Error adding option:', err)
      throw err
    }
  }

  /**
   * Publish exam (make available for students)
   */
  static async publishExam(examId: string): Promise<void> {
    try {
      console.log(`📤 Publishing exam ${examId}...`)

      // Verify exam has at least 1 question
      const { data: questions, error: questionsError } = await supabase
        .from('cbt_questions')
        .select('id')
        .eq('cbt_exam_id', examId)

      if (questionsError || !questions || questions.length === 0) {
        throw new Error('Exam must have at least 1 question before publishing')
      }

      // Verify all questions have at least 1 correct option (for MCQ)
      const { data: allQuestions } = await supabase
        .from('cbt_questions')
        .select(`
          id,
          question_type,
          cbt_options(id, is_correct)
        `)
        .eq('cbt_exam_id', examId)

      for (const q of allQuestions || []) {
        if (q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE') {
          const hasCorrect = (q.cbt_options as any[])?.some((opt) => opt.is_correct)
          if (!hasCorrect) {
            throw new Error(`Question "${q.id}" must have a correct answer before publishing`)
          }
        }
      }

      // Update status to PUBLISHED
      const { error: updateError } = await supabase
        .from('cbt_exams')
        .update({
          status: 'PUBLISHED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', examId)

      if (updateError) {
        throw new Error(`Failed to publish exam: ${updateError.message}`)
      }

      console.log(`✅ Exam published`)
    } catch (err: any) {
      console.error('❌ Error publishing exam:', err)
      throw err
    }
  }

  /**
   * Get exam details
   */
  static async getExamDetails(examId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('cbt_exams')
        .select(`
          *,
          subjects(name, code),
          class_arm_combos(
            classes(name),
            arms(name)
          ),
          cbt_questions(
            id,
            question_type,
            question_text,
            marks,
            display_order,
            cbt_options(
              id,
              option_text,
              is_correct,
              option_key,
              display_order
            )
          )
        `)
        .eq('id', examId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (err: any) {
      console.error('❌ Error fetching exam details:', err)
      throw err
    }
  }

  /**
   * Get teacher's exams
   */
  static async getTeacherExams(
    teacherId: string,
    schoolId: string
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('cbt_exams')
        .select(`
          id,
          title,
          exam_type,
          status,
          total_marks,
          passing_percentage,
          duration_minutes,
          created_at,
          subjects(name),
          class_arm_combos(
            classes(name),
            arms(name)
          )
        `)
        .eq('created_by', teacherId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (err: any) {
      console.error('❌ Error fetching teacher exams:', err)
      throw err
    }
  }

  /**
   * Get available exams for a student
   */
  static async getAvailableExamsForStudent(
    studentId: string,
    schoolId: string
  ): Promise<any[]> {
    try {
      console.log(`📚 Loading available exams for student ${studentId}...`)

      // Get student's class and subjects
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          class_arm_combo_id,
          student_subjects(subject_id)
        `)
        .eq('id', studentId)
        .single()

      if (studentError || !studentData) {
        throw new Error('Student not found')
      }

      const studentSubjectIds = (studentData.student_subjects as any[])?.map(
        (ss) => ss.subject_id
      ) || []

      if (studentSubjectIds.length === 0) {
        console.log('⚠️ Student has no enrolled subjects')
        return []
      }

      // Get exams for student's subjects and class
      const { data: exams, error: examsError } = await supabase
        .from('cbt_exams')
        .select(`
          id,
          title,
          description,
          exam_type,
          test_number,
          total_marks,
          passing_percentage,
          duration_minutes,
          start_time,
          end_time,
          status,
          created_at,
          updated_at,
          subjects(name, code),
          academic_terms(term_name)
        `)
        .eq('school_id', schoolId)
        .eq('class_arm_combo_id', studentData.class_arm_combo_id)
        .in('subject_id', studentSubjectIds)
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false })

      if (examsError) {
        throw new Error(examsError.message)
      }

      console.log(`✅ Found ${exams?.length || 0} available exams`)
      return exams || []
    } catch (err: any) {
      console.error('❌ Error fetching available exams:', err)
      throw err
    }
  }

  /**
   * Delete question and its options
   */
  static async deleteQuestion(questionId: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting question ${questionId}...`)

      // Delete options first (FK constraint)
      await supabase.from('cbt_options').delete().eq('question_id', questionId)

      // Delete question
      const { error } = await supabase
        .from('cbt_questions')
        .delete()
        .eq('id', questionId)

      if (error) {
        throw new Error(`Failed to delete question: ${error.message}`)
      }

      console.log(`✅ Question deleted`)
    } catch (err: any) {
      console.error('❌ Error deleting question:', err)
      throw err
    }
  }

  /**
   * Delete entire exam and related data
   */
  static async deleteExam(examId: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting exam ${examId}...`)

      // Delete in order of FK dependencies
      // 1. Delete answers
      const { data: submissions } = await supabase
        .from('cbt_submissions')
        .select('id')
        .eq('cbt_exam_id', examId)

      for (const sub of submissions || []) {
        await supabase.from('cbt_answers').delete().eq('submission_id', sub.id)
      }

      // 2. Delete submissions
      await supabase.from('cbt_submissions').delete().eq('cbt_exam_id', examId)

      // 3. Delete options
      const { data: questions } = await supabase
        .from('cbt_questions')
        .select('id')
        .eq('cbt_exam_id', examId)

      for (const q of questions || []) {
        await supabase.from('cbt_options').delete().eq('question_id', q.id)
      }

      // 4. Delete questions
      await supabase.from('cbt_questions').delete().eq('cbt_exam_id', examId)

      // 5. Delete exam
      const { error } = await supabase.from('cbt_exams').delete().eq('id', examId)

      if (error) {
        throw new Error(`Failed to delete exam: ${error.message}`)
      }

      console.log(`✅ Exam deleted`)
    } catch (err: any) {
      console.error('❌ Error deleting exam:', err)
      throw err
    }
  }
}
