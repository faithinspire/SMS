import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

// ============================================================================
// TYPES
// ============================================================================

export interface TeacherAssignment {
  id: string
  class_arm_combo_id: string
  subject_id: string
  subject_name: string
  class_name: string
  arm_name: string
}

export interface ClassStudent {
  id: string
  user_id: string
  admission_number: string
  full_name: string
  class_name: string
}

export interface StudentSubject {
  id: string
  subject_id: string
  subject_name: string
  subject_code: string
}

export interface ScoreEntry {
  test1_score: number | null
  test2_score: number | null
  test3_score: number | null
  test4_score: number | null
  exam_score: number | null
  cbt_exam_score: number | null
  teacher_comment: string | null
}

export interface StudentScore {
  subject_id: string
  subject_name: string
  subject_code: string
  test1_score: number | null
  test2_score: number | null
  test3_score: number | null
  test4_score: number | null
  test_total: number
  exam_score: number | null
  total_score: number
  percentage: number
  grade: string
  teacher_comment: string | null
}

export interface StudentScoreData {
  student_id: string
  student_name: string
  admission_number: string
  class_name: string
  subjects: StudentScore[]
  overall_percentage: number
  overall_average: number
  overall_grade: string
}

export interface SessionInfo {
  academic_session: string
  term: string
}

// ============================================================================
// GRADING SCALE (Can be moved to database later)
// ============================================================================

const GRADING_SCALE = [
  { min: 70, max: 100, grade: 'A' },
  { min: 60, max: 69, grade: 'B' },
  { min: 50, max: 59, grade: 'C' },
  { min: 40, max: 49, grade: 'D' },
  { min: 0, max: 39, grade: 'F' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateGrade(score: number): string {
  if (score < 0 || score > 100) return 'F'
  for (const range of GRADING_SCALE) {
    if (score >= range.min && score <= range.max) {
      return range.grade
    }
  }
  return 'F'
}

function calculateTestTotal(test1: number | null, test2: number | null, test3: number | null, test4: number | null): number {
  const scores = [test1, test2, test3, test4].filter(s => s !== null && s !== undefined) as number[]
  if (scores.length === 0) return 0
  return Math.min(scores.reduce((a, b) => a + b, 0), 40)
}

function calculateTotal(testTotal: number, examScore: number | null): number {
  const exam = examScore || 0
  const total = testTotal + exam
  return Math.min(total, 100)
}

function calculatePercentage(total: number): number {
  return Math.round((total / 100) * 100)
}

// ============================================================================
// SCORESHEET SERVICE
// ============================================================================

export class ScoreSheetService {
  /**
   * Get all classes assigned to a teacher
   * FIXED: Uses canonical subject_teacher_assignments table
   */
  static async getTeacherAssignments(
    teacherId: string,
    schoolId: string
  ): Promise<TeacherAssignment[]> {
    try {
      const { data: assignments, error } = await supabase
        .from('subject_teacher_assignments')
        .select(
          `
          id,
          class_arm_combo_id,
          subject_id,
          subject:subjects(id, name, code),
          class_combo:class_arm_combos(
            id,
            class:classes(id, name),
            arm:arms(id, name)
          )
        `
        )
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('Failed to fetch assignments:', error)
        throw new Error(`Failed to load assignments: ${error.message}`)
      }

      // Transform and flatten the data - include all subject assignments
      const assignments_map = new Map<string, TeacherAssignment[]>()

      assignments?.forEach((a: any) => {
        if (a.class_combo?.class && a.class_combo?.arm && a.subject) {
          const key = a.class_arm_combo_id
          if (!assignments_map.has(key)) {
            assignments_map.set(key, [])
          }
          assignments_map.get(key)!.push({
            id: a.id,
            class_arm_combo_id: a.class_arm_combo_id,
            subject_id: a.subject_id,
            subject_name: a.subject.name,
            class_name: a.class_combo.class.name,
            arm_name: a.class_combo.arm.name,
          })
        }
      })

      // Return all assignments (one per subject, even if same class)
      return Array.from(assignments_map.values()).flat()
    } catch (error) {
      console.error('ScoreSheetService.getTeacherAssignments error:', error)
      throw error
    }
  }

  /**
   * Get all students in a specific class
   */
  static async getClassStudents(
    classArmComboId: string,
    schoolId: string
  ): Promise<ClassStudent[]> {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select(
          `
          id,
          user_id,
          admission_number,
          class_arm_combo_id,
          user:users(id, full_name)
        `
        )
        .eq('class_arm_combo_id', classArmComboId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('Failed to fetch students:', error)
        throw new Error(`Failed to load students: ${error.message}`)
      }

      // Get class and arm names
      const { data: classCombo } = await supabase
        .from('class_arm_combos')
        .select('class:classes(name), arm:arms(name)')
        .eq('id', classArmComboId)
        .single()

      const className = classCombo
        ? `${classCombo.class.name} - ${classCombo.arm.name}`
        : 'Unknown Class'

      return (students || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        admission_number: s.admission_number,
        full_name: s.user?.full_name || 'Unknown',
        class_name: className,
      }))
    } catch (error) {
      console.error('ScoreSheetService.getClassStudents error:', error)
      throw error
    }
  }

  /**
   * Get subjects enrolled by a student in a class
   * FIXED: Uses canonical student_subjects table instead of deprecated student_subject_enrollment
   */
  static async getStudentSubjects(
    studentId: string,
    classArmComboId: string,
    schoolId: string
  ): Promise<StudentSubject[]> {
    try {
      const { data: enrollments, error } = await supabase
        .from('student_subjects')
        .select(
          `
          id,
          subject_id,
          subject:subjects(id, name, code)
        `
        )
        .eq('student_id', studentId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('Failed to fetch subjects:', error)
        throw new Error(`Failed to load subjects: ${error.message}`)
      }

      return (enrollments || [])
        .filter((e: any) => e.subject)
        .map((e: any) => ({
          id: e.id,
          subject_id: e.subject_id,
          subject_name: e.subject.name,
          subject_code: e.subject.code,
        }))
    } catch (error) {
      console.error('ScoreSheetService.getStudentSubjects error:', error)
      throw error
    }
  }

  /**
   * Get all scores for a student in a term and session
   * FIXED: Uses canonical score_sheets table instead of deprecated result_entries
   */
  static async getStudentScores(
    studentId: string,
    classArmComboId: string,
    schoolId: string,
    term: string,
    academicSession: string
  ): Promise<StudentScoreData> {
    try {
      // Get student info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, admission_number, user:users(full_name)')
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single()

      if (studentError || !student) {
        throw new Error('Student not found')
      }

      // Get class info
      const { data: classCombo } = await supabase
        .from('class_arm_combos')
        .select('class:classes(name), arm:arms(name)')
        .eq('id', classArmComboId)
        .single()

      const className = classCombo
        ? `${classCombo.class.name} - ${classCombo.arm.name}`
        : 'Unknown'

      // Get all enrolled subjects for this student
      const subjects = await this.getStudentSubjects(studentId, classArmComboId, schoolId)

      // Get scores for each subject from canonical score_sheets table
      const scoresPromises = subjects.map(async (subject) => {
        const { data: result } = await supabase
          .from('score_sheets')
          .select('*')
          .eq('student_id', studentId)
          .eq('subject_id', subject.subject_id)
          .eq('class_arm_combo_id', classArmComboId)
          .eq('school_id', schoolId)
          .eq('term', term)
          .eq('academic_session', academicSession)
          .single()

        const testTotal = result?.test1 || result?.test2 || result?.test3 || result?.test4
          ? calculateTestTotal(
              result?.test1,
              result?.test2,
              result?.test3,
              result?.test4
            )
          : 0
        const totalScore = result?.total || calculateTotal(testTotal, result?.exam)
        const percentage = calculatePercentage(totalScore)

        return {
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          test1_score: result?.test1 || null,
          test2_score: result?.test2 || null,
          test3_score: result?.test3 || null,
          test4_score: result?.test4 || null,
          test_total: testTotal,
          exam_score: result?.exam || null,
          total_score: totalScore,
          percentage,
          grade: result?.grade || calculateGrade(percentage),
          teacher_comment: null,
        }
      })

      const subjectScores = await Promise.all(scoresPromises)

      // Calculate overall stats
      const validScores = subjectScores.filter(s => s.total_score > 0)
      const overallPercentage = validScores.length > 0
        ? Math.round(validScores.reduce((sum, s) => sum + s.percentage, 0) / validScores.length)
        : 0
      const overallAverage = validScores.length > 0
        ? Math.round(validScores.reduce((sum, s) => sum + s.total_score, 0) / validScores.length)
        : 0

      return {
        student_id: studentId,
        student_name: student.user?.full_name || 'Unknown',
        admission_number: student.admission_number,
        class_name: className,
        subjects: subjectScores,
        overall_percentage: overallPercentage,
        overall_average: overallAverage,
        overall_grade: calculateGrade(overallPercentage),
      }
    } catch (error) {
      console.error('ScoreSheetService.getStudentScores error:', error)
      throw error
    }
  }

  /**
   * Save a single score entry
   * FIXED: Uses canonical score_sheets table instead of deprecated result_entries
   */
  static async saveScore(
    studentId: string,
    subjectId: string,
    classArmComboId: string,
    schoolId: string,
    teacherId: string,
    term: string,
    academicSession: string,
    scoreData: ScoreEntry
  ): Promise<void> {
    try {
      // Calculate derived values
      const testTotal = calculateTestTotal(
        scoreData.test1_score,
        scoreData.test2_score,
        scoreData.test3_score,
        scoreData.test4_score
      )
      const totalScore = calculateTotal(testTotal, scoreData.exam_score)
      const percentage = calculatePercentage(totalScore)
      const grade = calculateGrade(percentage)

      // Get academic_session_id from academic_sessions table
      const { data: session } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('session_year', academicSession)
        .single()

      // Try to update if exists, otherwise insert
      const { data: existing } = await supabase
        .from('score_sheets')
        .select('id')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .eq('class_arm_combo_id', classArmComboId)
        .eq('school_id', schoolId)
        .eq('term', term)
        .eq('academic_session', academicSession)
        .single()

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('score_sheets')
          .update({
            test1: scoreData.test1_score,
            test2: scoreData.test2_score,
            test3: scoreData.test3_score,
            test4: scoreData.test4_score,
            exam: scoreData.exam_score,
            total: totalScore,
            grade,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('score_sheets')
          .insert({
            school_id: schoolId,
            student_id: studentId,
            subject_id: subjectId,
            class_arm_combo_id: classArmComboId,
            teacher_id: teacherId,
            term,
            academic_session: academicSession,
            academic_session_id: session?.id,
            test1: scoreData.test1_score,
            test2: scoreData.test2_score,
            test3: scoreData.test3_score,
            test4: scoreData.test4_score,
            exam: scoreData.exam_score,
            total: totalScore,
            grade,
            test1_source: scoreData.test1_score ? 'MANUAL' : null,
            test2_source: scoreData.test2_score ? 'MANUAL' : null,
            test3_source: scoreData.test3_score ? 'MANUAL' : null,
            test4_source: scoreData.test4_score ? 'MANUAL' : null,
            exam_source: scoreData.exam_score ? 'MANUAL' : null,
          })

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('ScoreSheetService.saveScore error:', error)
      throw error
    }
  }

  /**
   * Get available sessions and terms
   */
  /**
   * Get sessions and terms from database (deprecated - use API instead)
   * This method is kept for backwards compatibility but should not be used
   * for new code. Use GET /api/sessions and GET /api/sessions/:id/terms instead.
   */
  static async getSessionsAndTerms(
    schoolId: string
  ): Promise<{ sessions: string[]; terms: string[] }> {
    try {
      console.warn('⚠️ DEPRECATED: scoresheet.service.getSessionsAndTerms() is deprecated. Use API routes instead.')
      
      // Fetch from database instead of hardcoding
      const { data: sessions, error: sessionError } = await supabase
        .from('academic_sessions')
        .select('session_year')
        .eq('school_id', schoolId)
        .order('start_year', { ascending: false })
      
      if (sessionError) {
        console.error('Error fetching sessions:', sessionError)
        return { sessions: [], terms: [] }
      }
      
      const sessionsList = (sessions || []).map(s => s.session_year)
      const terms = ['First Term', 'Second Term', 'Third Term']
      
      return { sessions: sessionsList, terms }
    } catch (error) {
      console.error('ScoreSheetService.getSessionsAndTerms error:', error)
      throw error
    }
  }

  /**
   * Get attendance for a student
   */
  static async getStudentAttendance(
    studentId: string,
    classArmComboId: string
  ): Promise<{ present: number; absent: number; late: number; total: number }> {
    try {
      const { data: records } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)
        .eq('class_arm_combo_id', classArmComboId)

      const stats = {
        present: 0,
        absent: 0,
        late: 0,
        total: records?.length || 0,
      }

      records?.forEach((r: any) => {
        if (r.status === 'PRESENT') stats.present++
        else if (r.status === 'ABSENT') stats.absent++
        else if (r.status === 'LATE') stats.late++
      })

      return stats
    } catch (error) {
      console.error('ScoreSheetService.getStudentAttendance error:', error)
      return { present: 0, absent: 0, late: 0, total: 0 }
    }
  }
}
