/**
 * CBT Scoring Service
 * Handles auto-scoring of MCQ exams and syncing to report card
 */

import { supabase } from '@/lib/supabase-client'

export interface ScoringResult {
  submission_id: string
  total_score: number
  total_marks: number
  percentage: number
  passed: boolean
  grade: string
}

export class CBTScoringService {
  /**
   * Score an exam submission
   * Auto-marks all MCQ answers and calculates total
   */
  static async scoreSubmission(submissionId: string): Promise<ScoringResult> {
    try {
      console.log(`📊 Scoring submission ${submissionId}...`)

      // Get submission details
      const { data: submission, error: submissionError } = await supabase
        .from('cbt_submissions')
        .select(`
          id,
          cbt_exam_id,
          student_id,
          school_id,
          term_id,
          cbt_exams(total_marks, passing_percentage, test_number, exam_type)
        `)
        .eq('id', submissionId)
        .single()

      if (submissionError || !submission) {
        throw new Error(`Submission not found: ${submissionError?.message}`)
      }

      const exam = (submission as any).cbt_exams
      const totalMarks = exam.total_marks || 100
      const passingPercentage = exam.passing_percentage || 50

      // Get all questions and correct answers
      const { data: questions, error: questionsError } = await supabase
        .from('cbt_questions')
        .select(`
          id,
          marks,
          question_type,
          cbt_options(id, is_correct)
        `)
        .eq('cbt_exam_id', submission.cbt_exam_id)

      if (questionsError || !questions) {
        throw new Error(`Failed to load questions: ${questionsError?.message}`)
      }

      // Build map of question -> correct option
      const correctAnswers: Record<string, string> = {}
      questions.forEach((q: any) => {
        const correctOption = (q.cbt_options as any[])?.find((opt: any) => opt.is_correct)
        if (correctOption) {
          correctAnswers[q.id] = correctOption.id
        }
      })

      // Get all answers submitted
      const { data: answers, error: answersError } = await supabase
        .from('cbt_answers')
        .select('id, question_id, selected_option_id, answer_text')
        .eq('submission_id', submissionId)

      if (answersError) {
        throw new Error(`Failed to load answers: ${answersError?.message}`)
      }

      // Score each answer
      let totalScore = 0
      const scoredAnswers: any[] = []

      for (const answer of answers || []) {
        const question = questions.find((q: any) => q.id === answer.question_id)
        if (!question) continue

        const correctOptionId = correctAnswers[answer.question_id]
        const isCorrect = answer.selected_option_id === correctOptionId && !!correctOptionId
        const marksAwarded = isCorrect ? (question.marks || 1) : 0

        if (isCorrect) {
          totalScore += marksAwarded
        }

        scoredAnswers.push({
          id: answer.id,
          is_correct: isCorrect,
          marks_awarded: marksAwarded,
        })
      }

      // Calculate percentage and grade
      const percentage = Math.round((totalScore / totalMarks) * 100)
      const passed = percentage >= passingPercentage
      const grade = this.calculateGrade(percentage)

      console.log(`✅ Scored: ${totalScore}/${totalMarks} (${percentage}%) - ${grade}`)

      // Update all answers with scoring
      for (const scored of scoredAnswers) {
        await supabase
          .from('cbt_answers')
          .update({
            is_correct: scored.is_correct,
            marks_awarded: scored.marks_awarded,
          })
          .eq('id', scored.id)
      }

      // Update submission with scores
      const { error: updateError } = await supabase
        .from('cbt_submissions')
        .update({
          score: totalScore,
          percentage,
          passed,
          status: 'GRADED',
          graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId)

      if (updateError) {
        throw new Error(`Failed to update submission: ${updateError.message}`)
      }

      console.log(`✅ Submission updated with scores`)

      // Sync to score_sheets
      await this.syncScoresToScoreSheet(
        submission.school_id,
        submission.student_id,
        submission.cbt_exam_id,
        totalScore,
        totalMarks,
        percentage,
        passed,
        grade,
        submission.term_id
      )

      return {
        submission_id: submissionId,
        total_score: totalScore,
        total_marks: totalMarks,
        percentage,
        passed,
        grade,
      }
    } catch (err: any) {
      console.error('❌ Scoring error:', err)
      throw err
    }
  }

  /**
   * Sync CBT score to score_sheets (report card)
   */
  static async syncScoresToScoreSheet(
    schoolId: string,
    studentId: string,
    cbtExamId: string,
    totalScore: number,
    totalMarks: number,
    percentage: number,
    passed: boolean,
    grade: string,
    termId?: string
  ): Promise<void> {
    try {
      console.log(`📝 Syncing CBT score to score_sheets...`)

      // Get exam details to find subject and test_number
      const { data: exam, error: examError } = await supabase
        .from('cbt_exams')
        .select('subject_id, exam_type, test_number')
        .eq('id', cbtExamId)
        .single()

      if (examError || !exam) {
        console.warn('⚠️ Could not find exam details, skipping score_sheets sync')
        return
      }

      const subjectId = exam.subject_id

      // Determine which score column to update based on exam type and test_number
      let updateData: Record<string, any> = {
        grade,
        updated_at: new Date().toISOString(),
      }

      if (exam.exam_type === 'EXAM') {
        updateData.exam = totalScore
        updateData.exam_source = 'CBT'
      } else if (exam.exam_type === 'TEST') {
        // Map test_number (1-4) to test1, test2, test3, test4
        const testColumn = `test${exam.test_number || 1}`
        updateData[testColumn] = totalScore
        updateData[`${testColumn}_source`] = 'CBT'
      }

      // Get current term if not provided
      let currentTermId = termId
      if (!currentTermId) {
        const { data: termData } = await supabase
          .from('academic_terms')
          .select('id')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .order('term_order', { ascending: false })
          .limit(1)
          .single()

        currentTermId = termData?.id
      }

      if (!currentTermId) {
        console.warn('⚠️ Could not determine current term, cannot sync score_sheets')
        return
      }

      // Update score_sheets
      const { error: updateError } = await supabase
        .from('score_sheets')
        .update(updateData)
        .match({
          school_id: schoolId,
          student_id: studentId,
          subject_id: subjectId,
          term_id: currentTermId,
        })

      if (updateError) {
        console.warn(`⚠️ Could not update score_sheets: ${updateError.message}`)
        // Non-critical, continue
      } else {
        console.log(`✅ Score synced to score_sheets`)
      }
    } catch (err: any) {
      console.warn('⚠️ Error syncing to score_sheets:', err.message)
      // Non-critical, don't throw
    }
  }

  /**
   * Calculate grade based on percentage
   */
  static calculateGrade(percentage: number): string {
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    if (percentage >= 50) return 'E'
    return 'F'
  }

  /**
   * Get submission results for display
   */
  static async getSubmissionResults(submissionId: string): Promise<any> {
    try {
      const { data: submission, error: submissionError } = await supabase
        .from('cbt_submissions')
        .select(`
          id,
          score,
          percentage,
          passed,
          started_at,
          submitted_at,
          cbt_exams(title, total_marks, passing_percentage),
          cbt_answers(
            id,
            question_id,
            selected_option_id,
            answer_text,
            marks_awarded,
            is_correct,
            cbt_questions(
              question_text,
              marks,
              question_type,
              cbt_options(option_text, is_correct)
            ),
            selected_option: cbt_options(option_text)
          )
        `)
        .eq('id', submissionId)
        .single()

      if (submissionError) {
        throw new Error(submissionError.message)
      }

      return submission
    } catch (err: any) {
      console.error('❌ Error fetching results:', err)
      throw err
    }
  }

  /**
   * Get exam statistics for teacher
   */
  static async getExamStatistics(examId: string): Promise<any> {
    try {
      const { data: submissions, error } = await supabase
        .from('cbt_submissions')
        .select('score, percentage, passed')
        .eq('cbt_exam_id', examId)
        .eq('status', 'GRADED')

      if (error) {
        throw new Error(error.message)
      }

      if (!submissions || submissions.length === 0) {
        return {
          total_submissions: 0,
          average_score: 0,
          pass_rate: 0,
          grade_distribution: {},
        }
      }

      const totalSubmissions = submissions.length
      const totalScore = submissions.reduce((sum, s) => sum + (s.score || 0), 0)
      const averageScore = Math.round(totalScore / totalSubmissions)
      const passedCount = submissions.filter((s) => s.passed).length
      const passRate = Math.round((passedCount / totalSubmissions) * 100)

      // Grade distribution
      const gradeDistribution = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        F: 0,
      }

      submissions.forEach((s) => {
        const grade = this.calculateGrade(s.percentage)
        gradeDistribution[grade as keyof typeof gradeDistribution]++
      })

      return {
        total_submissions: totalSubmissions,
        average_score: averageScore,
        average_percentage: Math.round(
          submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / totalSubmissions
        ),
        pass_rate: passRate,
        grade_distribution: gradeDistribution,
        highest_score: Math.max(...submissions.map((s) => s.score || 0)),
        lowest_score: Math.min(...submissions.map((s) => s.score || 0)),
      }
    } catch (err: any) {
      console.error('❌ Error calculating statistics:', err)
      throw err
    }
  }
}
