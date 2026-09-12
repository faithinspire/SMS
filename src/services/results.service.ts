/**
 * Results Service
 * Handles score sheets, results display, and analytics
 */

import { supabase } from '@/lib/supabase-client'

export class ResultsService {
  /**
   * Get student results for a term
   */
  static async getStudentTermResults(
    studentId: string,
    termId: string,
    schoolId: string
  ): Promise<any[]> {
    try {
      console.log(`📊 Loading student results for term ${termId}...`)

      const { data: results, error } = await supabase
        .from('score_sheets')
        .select(`
          id,
          subject_id,
          subjects(name, code),
          test1,
          test2,
          test3,
          test4,
          exam,
          total,
          grade,
          test1_source,
          test2_source,
          test3_source,
          test4_source,
          exam_source
        `)
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .eq('school_id', schoolId)
        .order('subjects.name', { ascending: true })

      if (error) throw error

      console.log(`✅ Loaded ${results?.length || 0} results`)
      return results || []
    } catch (err: any) {
      console.error('❌ Error loading student results:', err)
      throw err
    }
  }

  /**
   * Get all student results across terms
   */
  static async getStudentAllResults(
    studentId: string,
    schoolId: string
  ): Promise<any[]> {
    try {
      const { data: results, error } = await supabase
        .from('score_sheets')
        .select(`
          id,
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

      return results || []
    } catch (err: any) {
      console.error('❌ Error loading all results:', err)
      throw err
    }
  }

  /**
   * Get class results for a term
   */
  static async getClassResults(
    classArmComboId: string,
    termId: string,
    schoolId: string,
    subjectId?: string
  ): Promise<any[]> {
    try {
      console.log(`👥 Loading class results for ${classArmComboId}...`)

      let query = supabase
        .from('score_sheets')
        .select(`
          id,
          student_id,
          students(
            user_id,
            users(full_name),
            class_arm_combos(classes(name), arms(name))
          ),
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
        .eq('school_id', schoolId)
        .eq('term_id', termId)

      // Filter by subject if provided
      if (subjectId) {
        query = query.eq('subject_id', subjectId)
      }

      // Get all students in class, then their scores
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_arm_combo_id', classArmComboId)

      const studentIds = classStudents?.map((s) => s.id) || []
      if (studentIds.length === 0) {
        return []
      }

      query = query.in('student_id', studentIds)

      const { data: results, error } = await query.order('students.users.full_name', {
        ascending: true,
      })

      if (error) throw error

      console.log(`✅ Loaded class results for ${results?.length || 0} students`)
      return results || []
    } catch (err: any) {
      console.error('❌ Error loading class results:', err)
      throw err
    }
  }

  /**
   * Calculate class statistics
   */
  static async getClassStatistics(
    classArmComboId: string,
    termId: string,
    schoolId: string,
    subjectId?: string
  ): Promise<any> {
    try {
      const results = await this.getClassResults(classArmComboId, termId, schoolId, subjectId)

      if (results.length === 0) {
        return {
          total_students: 0,
          average_score: 0,
          highest_score: 0,
          lowest_score: 0,
          grade_distribution: {},
          pass_rate: 0,
        }
      }

      const scores = results
        .map((r: any) => r.total)
        .filter((s: any) => s !== null && s !== undefined)
      const grades = results
        .map((r: any) => r.grade)
        .filter((g: any) => g !== null && g !== undefined)

      const totalStudents = results.length
      const averageScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0

      const gradeDistribution = {
        A: grades.filter((g) => g === 'A').length,
        B: grades.filter((g) => g === 'B').length,
        C: grades.filter((g) => g === 'C').length,
        D: grades.filter((g) => g === 'D').length,
        E: grades.filter((g) => g === 'E').length,
        F: grades.filter((g) => g === 'F').length,
      }

      const passingGrades = grades.filter((g) => ['A', 'B', 'C', 'D'].includes(g)).length
      const passRate = totalStudents > 0 ? Math.round((passingGrades / totalStudents) * 100) : 0

      return {
        total_students: totalStudents,
        average_score: averageScore,
        highest_score: highestScore,
        lowest_score: lowestScore,
        grade_distribution: gradeDistribution,
        pass_rate: passRate,
      }
    } catch (err: any) {
      console.error('❌ Error calculating statistics:', err)
      throw err
    }
  }

  /**
   * Get subject performance across classes
   */
  static async getSubjectPerformance(
    subjectId: string,
    termId: string,
    schoolId: string
  ): Promise<any> {
    try {
      const { data: results, error } = await supabase
        .from('score_sheets')
        .select(`
          total,
          grade
        `)
        .eq('subject_id', subjectId)
        .eq('term_id', termId)
        .eq('school_id', schoolId)

      if (error) throw error

      const scores = (results || [])
        .map((r: any) => r.total)
        .filter((s: any) => s !== null && s !== undefined)
      const grades = (results || [])
        .map((r: any) => r.grade)
        .filter((g: any) => g !== null && g !== undefined)

      return {
        total_assessed: results?.length || 0,
        average_score: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0,
        highest_score: scores.length > 0 ? Math.max(...scores) : 0,
        lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
        grade_a: grades.filter((g) => g === 'A').length,
        grade_b: grades.filter((g) => g === 'B').length,
        grade_c: grades.filter((g) => g === 'C').length,
        grade_f: grades.filter((g) => g === 'F').length,
      }
    } catch (err: any) {
      console.error('❌ Error loading subject performance:', err)
      throw err
    }
  }

  /**
   * Get student transcript (all results across terms)
   */
  static async getStudentTranscript(
    studentId: string,
    schoolId: string
  ): Promise<any> {
    try {
      const { data: student } = await supabase
        .from('students')
        .select(`
          user_id,
          users(full_name, email),
          admission_number,
          class_arm_combos(
            classes(name, level),
            arms(name)
          )
        `)
        .eq('id', studentId)
        .single()

      if (!student) {
        throw new Error('Student not found')
      }

      const results = await this.getStudentAllResults(studentId, schoolId)

      // Calculate GPA (average of all grades across all terms)
      const allScores = results
        .map((r: any) => r.total)
        .filter((s: any) => s !== null && s !== undefined)
      const gpa = allScores.length > 0 ? (allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length).toFixed(2) : '0'

      return {
        student_info: {
          name: (student.users as any)?.full_name,
          email: (student.users as any)?.email,
          admission_number: student.admission_number,
          class: (student.class_arm_combos as any)?.classes?.name,
          arm: (student.class_arm_combos as any)?.arms?.name,
        },
        gpa,
        results_by_term: results,
      }
    } catch (err: any) {
      console.error('❌ Error loading transcript:', err)
      throw err
    }
  }
}
