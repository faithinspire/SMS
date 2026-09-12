/**
 * Student Dashboard Service
 * Loads student-specific data (class, subjects, results)
 */

import { supabase } from '@/lib/supabase-client'

export interface StudentDashboardData {
  student_info: {
    name: string
    email: string
    admission_number: string
  }
  class_info: {
    class_name: string
    arm_name: string
    stream_name?: string
    class_teacher_name: string
  }
  my_subjects: any[]
  current_term_results: any[]
  available_exams: any[]
}

export class StudentDashboardService {
  /**
   * Get student dashboard data
   */
  static async getDashboardData(userId: string, schoolId: string): Promise<StudentDashboardData> {
    try {
      console.log(`🎓 Loading student dashboard for ${userId}...`)

      // Get student info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        throw new Error('Student not found')
      }

      // Get student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          class_arm_combos(
            id,
            class_teacher_id,
            classes(name, level),
            arms(name),
            streams(name),
            users(full_name)
          )
        `)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .single()

      if (studentError || !student) {
        throw new Error('Student profile not found')
      }

      const classInfo = (student.class_arm_combos as any)
      const classTeacherName =
        (classInfo?.users as any)?.full_name || 'Not assigned'

      const studentInfo = {
        name: user.full_name,
        email: user.email,
        admission_number: student.admission_number || 'N/A',
      }

      const classDetails = {
        class_name: classInfo?.classes?.name || 'Unknown',
        arm_name: classInfo?.arms?.name || 'Unknown',
        stream_name: classInfo?.streams?.name,
        class_teacher_name: classTeacherName,
      }

      // Get enrolled subjects with teachers
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('student_subjects')
        .select(`
          subject_id,
          subjects(id, name, code),
          student_subject_teachers(
            teacher_id,
            users(full_name)
          )
        `)
        .eq('student_id', student.id)

      if (enrollmentsError) console.warn('⚠️ Error loading subjects:', enrollmentsError)

      const mySubjects = (enrollments || []).map((e: any) => ({
        id: e.subject_id,
        name: e.subjects?.name,
        code: e.subjects?.code,
        teacher_name:
          (e.student_subject_teachers as any)?.[0]?.users?.full_name || 'Not assigned',
      }))

      // Get current term results
      const { data: terms } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('term_order', { ascending: false })
        .limit(1)

      let currentTermResults: any[] = []
      if (terms && terms.length > 0) {
        const { data: results, error: resultsError } = await supabase
          .from('score_sheets')
          .select(`
            subject_id,
            subjects(name, code),
            test1,
            test2,
            test3,
            test4,
            exam,
            total,
            grade
          `)
          .eq('student_id', student.id)
          .eq('term_id', terms[0].id)

        if (resultsError) console.warn('⚠️ Error loading results:', resultsError)
        currentTermResults = results || []
      }

      // Get available exams
      const { data: availableExams, error: examsError } = await supabase
        .from('cbt_exams')
        .select(`
          id,
          title,
          exam_type,
          test_number,
          total_marks,
          duration_minutes,
          status,
          created_at,
          subjects(name),
          academic_terms(term_name)
        `)
        .eq('school_id', schoolId)
        .eq('class_arm_combo_id', classInfo?.id)
        .in('subject_id', mySubjects.map((s) => s.id))
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false })
        .limit(20)

      if (examsError) console.warn('⚠️ Error loading exams:', examsError)

      console.log('✅ Student dashboard loaded')

      return {
        student_info: studentInfo,
        class_info: classDetails,
        my_subjects: mySubjects,
        current_term_results: currentTermResults,
        available_exams: availableExams || [],
      }
    } catch (err: any) {
      console.error('❌ Error loading student dashboard:', err)
      throw err
    }
  }

  /**
   * Get all term results for student
   */
  static async getAllResults(studentId: string, schoolId: string): Promise<any[]> {
    try {
      const { data: allResults, error } = await supabase
        .from('score_sheets')
        .select(`
          term_id,
          academic_terms(term_name, term_order),
          subject_id,
          subjects(name, code),
          test1,
          test2,
          test3,
          test4,
          exam,
          total,
          grade
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('academic_terms.term_order', { ascending: false })

      if (error) throw error

      return allResults || []
    } catch (err: any) {
      console.error('❌ Error loading all results:', err)
      throw err
    }
  }

  /**
   * Get exam submission details for student
   */
  static async getExamSubmissions(studentId: string): Promise<any[]> {
    try {
      const { data: submissions, error } = await supabase
        .from('cbt_submissions')
        .select(`
          id,
          cbt_exam_id,
          cbt_exams(title, total_marks),
          score,
          percentage,
          passed,
          status,
          submitted_at
        `)
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(20)

      if (error) throw error

      return submissions || []
    } catch (err: any) {
      console.error('❌ Error loading exam submissions:', err)
      throw err
    }
  }

  /**
   * Get specific exam details for student
   */
  static async getExamResult(submissionId: string): Promise<any> {
    try {
      const { data: submission, error } = await supabase
        .from('cbt_submissions')
        .select(`
          id,
          cbt_exam_id,
          cbt_exams(
            title,
            total_marks,
            passing_percentage,
            allow_review
          ),
          score,
          percentage,
          passed,
          started_at,
          submitted_at,
          cbt_answers(
            question_id,
            selected_option_id,
            answer_text,
            marks_awarded,
            is_correct,
            cbt_questions(
              question_text,
              marks,
              question_type,
              cbt_options(option_text, is_correct, option_key)
            )
          )
        `)
        .eq('id', submissionId)
        .single()

      if (error) throw error

      return submission
    } catch (err: any) {
      console.error('❌ Error loading exam result:', err)
      throw err
    }
  }
}
