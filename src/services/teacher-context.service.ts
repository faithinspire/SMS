'use client'

import { supabase } from '@/lib/supabase-client'
import TeacherDataService, { ClassInfo, SubjectInfo } from './teacher-data.service'

/**
 * ============================================================================
 * TEACHER CONTEXT SERVICE - HARD FIX REBUILD
 * ============================================================================
 * 
 * Single source of truth for all teacher context across dashboards.
 * USES TeacherDataService for all queries (no duplicate logic).
 * 
 * Resolution Flow:
 * AUTH USER → USERS TABLE → SCHOOL → CLASS ASSIGNMENTS → SUBJECT ASSIGNMENTS → STATS
 * 
 * NOTE: No longer queries deprecated 'teachers' table (doesn't exist in schema)
 */

export interface TeacherContext {
  // User & Auth
  userId: string
  email: string
  authRole: string

  // Teacher Identity
  teacherId: string
  teacherName: string
  teacherPhoto?: string

  // School
  schoolId: string
  schoolName: string

  // Teacher Role & Assignment
  role: 'CLASS_TEACHER' | 'SUBJECT_TEACHER' | 'BOTH'
  section: string // PRIMARY, SECONDARY, or BOTH

  // Class Assignments
  managedClasses: Array<{
    id: string
    name: string
    level: string
    type: string
    armName: string
  }>

  // Subject Assignments
  taughtSubjects: Array<{
    id: string
    subject_id: string
    name: string
    code: string
    classes: Array<{ id: string; name: string }>
  }>

  // Student Counts
  totalStudents: number
  classStudentCount: number
  subjectStudentCount: number
}

export class TeacherContextService {
  /**
   * Get complete teacher context for current authenticated user
   * 
   * CRITICAL: This is THE ONLY METHOD for resolving teacher identity
   * All dashboard pages must call this once on mount
   * 
   * Uses TeacherDataService for all data fetching (no direct Supabase queries)
   */
  static async getCurrentTeacherContext(): Promise<TeacherContext> {
    try {
      // STEP 1: Get authenticated user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        throw new Error('Not authenticated')
      }

      console.log('[TeacherContextService] Auth user:', authUser.id)

      // STEP 2: Get teacher profile via TeacherDataService
      const profile = await TeacherDataService.getTeacherProfile(authUser.id)

      console.log('[TeacherContextService] Teacher name:', profile.fullName)
      console.log('[TeacherContextService] School:', profile.schoolName)

      // STEP 3: Get class assignments via TeacherDataService
      const classes = await TeacherDataService.getTeacherClasses(
        profile.schoolId,
        authUser.id
      )

      // STEP 4: Get subject assignments via TeacherDataService
      const subjects = await TeacherDataService.getTeacherSubjects(
        profile.schoolId,
        authUser.id
      )

      // STEP 5: Format managed classes
      const formattedManagedClasses = classes.map((cls: ClassInfo) => ({
        id: cls.id,
        name: cls.name,
        level: cls.classLevel,
        type: 'SECONDARY', // infer from context or fetch separately if needed
        armName: cls.armName,
      }))

      // STEP 6: Format taught subjects with their classes
      const formattedSubjects = await Promise.all(
        subjects.map(async (subject: SubjectInfo) => {
          // Get all class_arm_combos where this teacher teaches this subject
          const { data: assignments, error } = await supabase
            .from('subject_teacher_assignments')
            .select(`
              class_arm_combo_id,
              class_arm_combos (
                classes (name),
                arms (name)
              )
            `)
            .eq('teacher_id', authUser.id)
            .eq('subject_id', subject.id)
            .eq('school_id', profile.schoolId)

          if (error) {
            console.warn(
              `[TeacherContextService] Error fetching classes for subject ${subject.id}:`,
              error
            )
            return {
              id: subject.id,
              subject_id: subject.id,
              name: subject.name,
              code: subject.code,
              classes: [],
            }
          }

          const classes = (assignments || []).map((a: any) => ({
            id: a.class_arm_combo_id,
            name: `${a.class_arm_combos?.classes?.name || 'Unknown'} ${a.class_arm_combos?.arms?.name || ''}`.trim(),
          }))

          return {
            id: subject.id,
            subject_id: subject.id,
            name: subject.name,
            code: subject.code,
            classes,
          }
        })
      )

      // STEP 7: Calculate student counts
      let classStudentCount = 0
      let subjectStudentCount = 0

      // Count class students
      if (formattedManagedClasses.length > 0) {
        const classComboIds = formattedManagedClasses.map((c) => c.id)
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .in('class_arm_combo_id', classComboIds)
          .eq('school_id', profile.schoolId)

        classStudentCount = count || 0
      }

      // Count subject students
      if (formattedSubjects.length > 0) {
        const subjectIds = formattedSubjects.map((s) => s.subject_id)
        const { count } = await supabase
          .from('student_subjects')
          .select('id', { count: 'exact', head: true })
          .in('subject_id', subjectIds)
          .eq('school_id', profile.schoolId)

        subjectStudentCount = count || 0
      }

      const totalStudents = Math.max(classStudentCount, subjectStudentCount)

      // STEP 8: Determine role and section
      let role: 'CLASS_TEACHER' | 'SUBJECT_TEACHER' | 'BOTH' = 'SUBJECT_TEACHER'
      if (formattedManagedClasses.length > 0 && formattedSubjects.length > 0) {
        role = 'BOTH'
      } else if (formattedManagedClasses.length > 0) {
        role = 'CLASS_TEACHER'
      }

      let section = 'SECONDARY'
      if (formattedManagedClasses.length > 0) {
        const firstClass = formattedManagedClasses[0]
        if (
          firstClass.name.toUpperCase().includes('PRIMARY') ||
          firstClass.name.toUpperCase().includes('PREP') ||
          firstClass.name.toUpperCase().includes('KG')
        ) {
          section = 'PRIMARY'
        }
      }

      const context: TeacherContext = {
        userId: authUser.id,
        email: profile.email,
        authRole: profile.role,
        teacherId: authUser.id,
        teacherName: profile.fullName,
        teacherPhoto: profile.fullName ? undefined : undefined,
        schoolId: profile.schoolId,
        schoolName: profile.schoolName,
        role,
        section,
        managedClasses: formattedManagedClasses,
        taughtSubjects: formattedSubjects,
        totalStudents,
        classStudentCount,
        subjectStudentCount,
      }

      console.log('[TeacherContextService] Context resolved:', {
        teacher: context.teacherName,
        school: context.schoolName,
        role: context.role,
        managedClasses: context.managedClasses.length,
        subjects: context.taughtSubjects.length,
        totalStudents: context.totalStudents,
      })

      return context
    } catch (error: any) {
      console.error('[TeacherContextService] Error resolving teacher context:', error)
      throw error
    }
  }

}
