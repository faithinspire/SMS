/**
 * Result Aggregation Service
 * 
 * Handles the flow of canonical score_sheets data to different user views:
 * - Class Teacher Result (aggregates all subjects for their class)
 * - Student Result (shows all their subjects)
 * - Admin/Principal Result (school-wide aggregation)
 * 
 * This is the SINGLE SOURCE OF TRUTH for result calculation logic.
 */

import { supabase } from '@/lib/supabase-client'
import { calculateGrade } from '@/utils/grading'
import { calculateScores } from '@/utils/scoring'

export interface SubjectScore {
  subject_id: string
  subject_name: string
  ca1?: number | null
  ca2?: number | null
  ca3?: number | null
  ca4?: number | null
  exam?: number | null
  total: number
  grade: string
  remark: string
  teacher_name?: string
  teacher_id?: string
}

export interface StudentResult {
  student_id: string
  student_name: string
  admission_number?: string
  class_name?: string
  session_year: string
  term_name: string
  subjects: SubjectScore[]
  overall_score?: number
  overall_grade?: string
  status?: 'PASS' | 'FAIL'
}

export interface ClassResult {
  class_id: string
  class_name: string
  session_year: string
  term_name: string
  students: StudentResult[]
  class_average?: number
  pass_rate?: number
}

class ResultAggregationServiceImpl {
  /**
   * Get a student's result for a specific term.
   * 
   * Aggregates all scores from score_sheets for the student in the given term.
   * 
   * @param schoolId - School UUID
   * @param studentId - Student UUID
   * @param termId - Term UUID
   * @returns Student result with all subjects
   */
  async getStudentResult(
    schoolId: string,
    studentId: string,
    termId: string
  ): Promise<StudentResult | null> {
    try {
      if (!schoolId || !studentId || !termId) {
        throw new Error('Missing required parameters: schoolId, studentId, termId')
      }

      // Get student info with user data
      // First get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, admission_number, user_id, class_arm_combo_id')
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single()

      if (studentError || !student) {
        console.error('Student not found:', studentError)
        return null
      }

      // Then fetch user data separately to avoid ambiguous join
      let fullName = 'Unknown'
      if (student.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', student.user_id)
          .single()
        if (userData) {
          fullName = userData.full_name
        }
      }

      // Get class info
      let className = 'Unknown'
      if (student.class_arm_combo_id) {
        const { data: classArm } = await supabase
          .from('class_arm_combos')
          .select('classes(name), arms(name)')
          .eq('id', student.class_arm_combo_id)
          .single()

        if (classArm) {
          className = `${classArm.classes?.name || ''} ${classArm.arms?.name || ''}`.trim()
        }
      }

      // Get term info for display
      const { data: term } = await supabase
        .from('academic_terms')
        .select('term_name, session_id')
        .eq('id', termId)
        .single()

      let sessionYear = ''
      if (term?.session_id) {
        const { data: session } = await supabase
          .from('academic_sessions')
          .select('session_year')
          .eq('id', term.session_id)
          .single()
        sessionYear = session?.session_year || ''
      }

      // FIRST: Get ALL enrolled subjects for this student (from student_subjects table)
      const { data: enrolledSubjects, error: enrollmentError } = await supabase
        .from('student_subjects')
        .select(`
          id,
          subject_id,
          subjects(id, name, code)
        `)
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('subjects(name)', { ascending: true })

      if (enrollmentError) {
        console.error('[ResultAgg] Error fetching enrolled subjects:', enrollmentError)
      }

      console.log(`[ResultAgg] ✅ Fetched ${enrolledSubjects?.length || 0} enrolled subjects`)

      // If no subjects enrolled, return empty
      if (!enrolledSubjects || enrolledSubjects.length === 0) {
        console.warn(`[ResultAgg] ⚠️ No subjects enrolled for student ${studentId}`)
        return {
          student_id: studentId,
          student_name: fullName,
          admission_number: student.admission_number,
          class_name: className,
          session_year: sessionYear,
          term_name: term?.term_name || 'Unknown Term',
          subjects: [],
          overall_score: 0,
          overall_grade: 'N/A',
          status: 'INCOMPLETE',
        }
      }

      // SECOND: Get scores for this student and term (traditional teacher-entered)
      const { data: scores, error: scoresError } = await supabase
        .from('score_sheets')
        .select('*, subjects(name)')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .order('created_at', { ascending: false })

      if (scoresError) {
        console.error('[ResultAgg] Error fetching scores:', scoresError)
      }

      // Fetch CBT test scores (from cbt_test_slots system - max 4 tests)
      // FIXED: Now filters by term_id at database level (not in memory)
      const { data: cbtTestScores } = await supabase
        .from('cbt_test_scores')
        .select(
          `
          id,
          score,
          max_score,
          percentage,
          test_slot_id,
          cbt_test_slots(
            test_number,
            test_name,
            subject_id,
            max_score,
            term_id
          ),
          created_at
        `
        )
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .eq('cbt_test_slots.term_id', termId)  // ✅ FIXED: Filter at DB level with correct field

      console.log(
        `[ResultAgg] Query results: schoolId=${schoolId}, studentId=${studentId}, termId=${termId}`
      )
      console.log(`[ResultAgg] ✅ Fetched ${scores?.length || 0} score sheets (traditional)`)
      console.log(`[ResultAgg] ✅ Fetched ${cbtTestScores?.length || 0} CBT test scores`)

      scores?.forEach((score, idx) => {
        console.log(
          `[ResultAgg] Score #${idx + 1}: Subject=${score.subjects?.name}, T1=${score.test1}, T2=${score.test2}, T3=${score.test3}, T4=${score.test4}, Exam=${score.exam}`
        )
      })

      // Build subjects array from enrolled subjects (LEFT JOIN with scores)
      const subjects: SubjectScore[] = (enrolledSubjects || []).map((enrollment: any) => {
        const subjectId = enrollment.subject_id
        const subjectName = enrollment.subjects?.name || 'Unknown Subject'

        // Find corresponding score sheet for this subject (if exists)
        const score = (scores || []).find((s: any) => s.subject_id === subjectId)

        if (score) {
          // Subject has scores - calculate
          const calculated = calculateScores({
            ca1: score.test1,
            ca2: score.test2,
            ca3: score.test3,
            ca4: score.test4,
            exam: score.exam,
          })
          const gradeInfo = calculateGrade(calculated.total)

          return {
            subject_id: subjectId,
            subject_name: subjectName,
            ca1: score.test1,
            ca2: score.test2,
            ca3: score.test3,
            ca4: score.test4,
            exam: score.exam,
            total: calculated.total,
            grade: gradeInfo.grade,
            remark: gradeInfo.remark,
            teacher_name: score.teacher_name,
            teacher_id: score.teacher_id,
          }
        } else {
          // Subject enrolled but NO scores yet - return empty scores
          return {
            subject_id: subjectId,
            subject_name: subjectName,
            ca1: null,
            ca2: null,
            ca3: null,
            ca4: null,
            exam: null,
            total: 0,
            grade: '-',
            remark: 'Not yet graded',
            teacher_name: null,
            teacher_id: null,
          }
        }
      })

      // Add CBT test slot scores to subjects (mapped to CA1-4 columns)
      if (cbtTestScores && cbtTestScores.length > 0) {
        console.log(`[ResultAgg] Processing ${cbtTestScores.length} CBT test slot scores`)

        // Group CBT scores by subject
        const cbtBySubject = new Map<string, any[]>()

        cbtTestScores.forEach((testScore: any) => {
          const subjectId = testScore.cbt_test_slots?.subject_id
          if (!cbtBySubject.has(subjectId)) {
            cbtBySubject.set(subjectId, [])
          }
          cbtBySubject.get(subjectId)!.push(testScore)
        })

        // For each subject with CBT scores, create or update subject entry
        cbtBySubject.forEach((testScores: any[], subjectId: string) => {
          // Check if subject already exists in traditional scores
          const existingSubjectIndex = subjects.findIndex((s) => s.subject_id === subjectId)

          // Map test slots to CA columns (test 1->CA1, 2->CA2, 3->CA3, 4->CA4)
          const ca1 = testScores.find((t) => t.cbt_test_slots?.test_number === 1)?.score || 0
          const ca2 = testScores.find((t) => t.cbt_test_slots?.test_number === 2)?.score || 0
          const ca3 = testScores.find((t) => t.cbt_test_slots?.test_number === 3)?.score || 0
          const ca4 = testScores.find((t) => t.cbt_test_slots?.test_number === 4)?.score || 0

          // Get first test slot info for subject details
          const firstSlot = testScores[0].cbt_test_slots

          if (existingSubjectIndex >= 0) {
            // Update existing subject with CBT test scores
            subjects[existingSubjectIndex].ca1 = ca1
            subjects[existingSubjectIndex].ca2 = ca2
            subjects[existingSubjectIndex].ca3 = ca3
            subjects[existingSubjectIndex].ca4 = ca4

            // Recalculate total and grade
            const calculated = calculateScores({
              ca1,
              ca2,
              ca3,
              ca4,
              exam: subjects[existingSubjectIndex].exam,
            })
            subjects[existingSubjectIndex].total = calculated.total
            subjects[existingSubjectIndex].grade = calculateGrade(calculated.total).grade
            subjects[existingSubjectIndex].remark = calculateGrade(calculated.total).remark

            console.log(
              `[ResultAgg] Updated subject ${subjectId}: CA1=${ca1}, CA2=${ca2}, CA3=${ca3}, CA4=${ca4}, Total=${calculated.total}`
            )
          } else {
            // Create new subject entry with only CBT scores
            const calculated = calculateScores({
              ca1,
              ca2,
              ca3,
              ca4,
              exam: 0,
            })

            subjects.push({
              subject_id: subjectId,
              subject_name: firstSlot?.test_name || 'Unknown Subject',
              ca1,
              ca2,
              ca3,
              ca4,
              exam: 0,
              total: calculated.total,
              grade: calculateGrade(calculated.total).grade,
              remark: calculateGrade(calculated.total).remark,
              teacher_name: 'System (CBT Tests)',
              teacher_id: null,
              is_cbt_test: true,
            })

            console.log(
              `[ResultAgg] Created CBT subject ${subjectId}: CA1=${ca1}, CA2=${ca2}, CA3=${ca3}, CA4=${ca4}, Total=${calculated.total}`
            )
          }
        })
      }

      // Calculate overall result
      const overallScore =
        subjects.length > 0
          ? Math.round(subjects.reduce((sum, s) => sum + s.total, 0) / subjects.length)
          : 0

      const overallGrade = calculateGrade(overallScore).grade

      // Determine status: ONLY mark PASS/FAIL if ALL subjects have scores
      // If any subject is incomplete (has null/0 scores), status is INCOMPLETE
      const allSubjectsComplete = subjects.length > 0 && subjects.every((s) => s.total > 0)
      let status: 'PASS' | 'FAIL' | 'INCOMPLETE' = 'INCOMPLETE'

      if (allSubjectsComplete) {
        status = overallScore >= 40 ? 'PASS' : 'FAIL'
      }

      return {
        student_id: studentId,
        student_name: fullName,
        admission_number: student.admission_number,
        class_name: className,
        session_year: sessionYear,
        term_name: term?.term_name || 'Unknown Term',
        subjects,
        overall_score: overallScore,
        overall_grade: overallGrade,
        status: status as any,
      }
    } catch (error) {
      console.error('[ResultAggregationService] getStudentResult error:', error)
      return null
    }
  }

  /**
   * Get class teacher's view of all students' results in their class.
   * 
   * Aggregates all scores for all students in the class for a given term.
   * 
   * @param schoolId - School UUID
   * @param classArmComboId - Class arm combo UUID
   * @param termId - Term UUID
   * @returns Class result with all students and their aggregated scores
   */
  async getClassResult(
    schoolId: string,
    classArmComboId: string,
    termId: string
  ): Promise<ClassResult | null> {
    try {
      if (!schoolId || !classArmComboId || !termId) {
        throw new Error('Missing required parameters: schoolId, classArmComboId, termId')
      }

      // Get class info
      const { data: classArm, error: classError } = await supabase
        .from('class_arm_combos')
        .select('id, classes(name), arms(name)')
        .eq('id', classArmComboId)
        .eq('school_id', schoolId)
        .single()

      if (classError || !classArm) {
        console.error('Class arm combo not found:', classError)
        return null
      }

      const className = `${classArm.classes?.name || ''} ${classArm.arms?.name || ''}`.trim()

      // Get term info
      const { data: term } = await supabase
        .from('academic_terms')
        .select('term_name, session_id')
        .eq('id', termId)
        .single()

      let sessionYear = ''
      if (term?.session_id) {
        const { data: session } = await supabase
          .from('academic_sessions')
          .select('session_year')
          .eq('id', term.session_id)
          .single()
        sessionYear = session?.session_year || ''
      }

      // Get all students in class
      const { data: students } = await supabase
        .from('students')
        .select('id, admission_number, user_id')
        .eq('school_id', schoolId)
        .eq('class_arm_combo_id', classArmComboId)
        .order('admission_number', { ascending: true })

      if (!students || students.length === 0) {
        // Empty class
        return {
          class_id: classArmComboId,
          class_name: className,
          session_year: sessionYear,
          term_name: term?.term_name || 'Unknown',
          students: [],
          class_average: 0,
          pass_rate: 0,
        }
      }

      // Get results for all students
      const studentResults: StudentResult[] = []
      for (const student of students) {
        const result = await this.getStudentResult(schoolId, student.id, termId)
        if (result) {
          studentResults.push(result)
        }
      }

      // Calculate class statistics
      const totalScores = studentResults.flatMap((s) => s.subjects.map((subj) => subj.total))
      const classAverage =
        totalScores.length > 0
          ? Math.round(totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length)
          : 0

      const passCount = studentResults.filter((s) => s.status === 'PASS').length
      const passRate =
        studentResults.length > 0
          ? Math.round((passCount / studentResults.length) * 100)
          : 0

      return {
        class_id: classArmComboId,
        class_name: className,
        session_year: sessionYear,
        term_name: term?.term_name || 'Unknown',
        students: studentResults,
        class_average: classAverage,
        pass_rate: passRate,
      }
    } catch (error) {
      console.error('[ResultAggregationService] getClassResult error:', error)
      return null
    }
  }

  /**
   * Get school-wide results for admin/principal view.
   * 
   * Aggregates results across all classes in the school for a given term.
   * 
   * @param schoolId - School UUID
   * @param termId - Term UUID
   * @returns Array of class results
   */
  async getSchoolResults(schoolId: string, termId: string): Promise<ClassResult[]> {
    try {
      if (!schoolId || !termId) {
        throw new Error('Missing required parameters: schoolId, termId')
      }

      // Get all class arms in school
      const { data: classArms } = await supabase
        .from('class_arm_combos')
        .select('id')
        .eq('school_id', schoolId)
        .order('id')

      if (!classArms || classArms.length === 0) {
        return []
      }

      // Get results for each class
      const classResults: ClassResult[] = []
      for (const classArm of classArms) {
        const result = await this.getClassResult(schoolId, classArm.id, termId)
        if (result) {
          classResults.push(result)
        }
      }

      return classResults
    } catch (error) {
      console.error('[ResultAggregationService] getSchoolResults error:', error)
      return []
    }
  }

  /**
   * Get subject-specific results (all students offering a subject).
   * 
   * Used by subject teachers to see performance on their subject.
   * 
   * @param schoolId - School UUID
   * @param subjectId - Subject UUID
   * @param termId - Term UUID
   * @returns Array of student scores for that subject
   */
  async getSubjectResults(
    schoolId: string,
    subjectId: string,
    termId: string
  ): Promise<SubjectScore[]> {
    try {
      if (!schoolId || !subjectId || !termId) {
        throw new Error('Missing required parameters: schoolId, subjectId, termId')
      }

      // Get all scores for this subject and term
      const { data: scores } = await supabase
        .from('score_sheets')
        .select('*, subjects(name), students(id, admission_number, user_id)')
        .eq('school_id', schoolId)
        .eq('subject_id', subjectId)
        .eq('term_id', termId)
        .order('students(admission_number)', { ascending: true })

      if (!scores) {
        return []
      }

      // Fetch user data separately for each student to avoid ambiguous join
      const scoresWithNames = await Promise.all(
        (scores || []).map(async (score: any) => {
          let studentName = 'Unknown'
          if (score.students?.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', score.students.user_id)
              .single()
            if (userData) {
              studentName = userData.full_name
            }
          }
          return { ...score, student_name: studentName }
        })
      )

      return scoresWithNames.map((score: any) => {
        const calculated = calculateScores({
          ca1: score.test1,
          ca2: score.test2,
          ca3: score.test3,
          ca4: score.test4,
          exam: score.exam,
        })

        const gradeInfo = calculateGrade(calculated.total)

        return {
          subject_id: score.subject_id,
          subject_name: score.subjects?.name || 'Unknown',
          ca1: score.test1,
          ca2: score.test2,
          ca3: score.test3,
          ca4: score.test4,
          exam: score.exam,
          total: calculated.total,
          grade: gradeInfo.grade,
          remark: gradeInfo.remark,
        }
      })
    } catch (error) {
      console.error('[ResultAggregationService] getSubjectResults error:', error)
      return []
    }
  }
}

// Export singleton instance
export const ResultAggregationService = new ResultAggregationServiceImpl()
