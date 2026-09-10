/**
 * CANONICAL SUBJECT SERVICE
 * 
 * This service is the SINGLE SOURCE OF TRUTH for all subject data.
 * 
 * ALL subject lookups MUST go through this service.
 * NO hardcoded subject arrays should exist elsewhere in the codebase.
 * ALL subject selections must use database IDs, NOT subject names.
 * 
 * This service ensures:
 * ✅ Consistent subject definitions across the system
 * ✅ No UUID/display problems (UUIDs stay in database, names in UI)
 * ✅ Automatic filtering by level/class
 * ✅ Automatic level mapping (class level → applicable subjects)
 * ✅ Reusable across teacher registration, student registration, score sheets, CBT, etc.
 */

import { supabase as clientSupabase } from '@/lib/supabase-client'

export interface CanonicalSubject {
  id: string
  name: string
  code: string
  school_id: string
  applicable_to_levels: number[]
  created_at: string
}

export interface SubjectWithStats extends CanonicalSubject {
  student_count?: number
  teacher_count?: number
  score_sheet_count?: number
  cbt_exam_count?: number
}

export class CanonicalSubjectService {
  /**
   * Get ALL subjects for a school
   * Used for admin subject management
   */
  static async getAllSubjectsForSchool(schoolId: string): Promise<CanonicalSubject[]> {
    const { data, error } = await clientSupabase
      .from('subjects')
      .select('id, name, code, school_id, applicable_to_levels, created_at')
      .eq('school_id', schoolId)
      .order('name', { ascending: true })

    if (error) throw new Error(`Failed to fetch subjects: ${error.message}`)
    return data || []
  }

  /**
   * Get subjects applicable to a specific class level
   * Level mapping: 0-8 (Primary), 9-11 (JSS), 12-14 (SSS)
   * 
   * Example: getSubjectsForLevel(schoolId, 3) returns Primary 3 subjects
   * Example: getSubjectsForLevel(schoolId, 12) returns SS1 subjects
   */
  static async getSubjectsForLevel(
    schoolId: string,
    level: number
  ): Promise<CanonicalSubject[]> {
    // Use PostgreSQL array containment operator @>
    // applicable_to_levels @> ARRAY[level] means level is in the array
    const { data, error } = await clientSupabase
      .from('subjects')
      .select('id, name, code, school_id, applicable_to_levels, created_at')
      .eq('school_id', schoolId)
      .contains('applicable_to_levels', [level])
      .order('name', { ascending: true })

    if (error) throw new Error(`Failed to fetch subjects for level: ${error.message}`)
    return data || []
  }

  /**
   * Get subjects for a class_arm_combo
   * Queries the combo to get class level, then returns applicable subjects
   */
  static async getSubjectsForClass(
    classArmComboId: string,
    schoolId: string
  ): Promise<CanonicalSubject[]> {
    // Get class level from the combo
    const { data: comboData, error: comboError } = await clientSupabase
      .from('class_arm_combos')
      .select('classes(level)')
      .eq('id', classArmComboId)
      .eq('school_id', schoolId)
      .single()

    if (comboError || !comboData) {
      throw new Error('Class not found')
    }

    const classLevel = (comboData.classes as any).level
    return this.getSubjectsForLevel(schoolId, classLevel)
  }

  /**
   * Get subjects taught by a specific teacher
   * Returns subjects linked via subject_teacher_assignments
   */
  static async getSubjectsTaughtByTeacher(
    teacherId: string,
    schoolId: string
  ): Promise<CanonicalSubject[]> {
    const { data, error } = await clientSupabase
      .from('subject_teacher_assignments')
      .select(
        `
        subjects!inner(id, name, code, school_id, applicable_to_levels, created_at)
      `
      )
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .order('subjects(name)', { ascending: true })

    if (error) throw new Error(`Failed to fetch teacher subjects: ${error.message}`)

    // Flatten the nested structure
    return (data || []).map((row: any) => row.subjects)
  }

  /**
   * Get subjects enrolled by a student
   * Returns subjects linked via student_subjects
   */
  static async getSubjectsEnrolledByStudent(
    studentId: string,
    schoolId: string
  ): Promise<CanonicalSubject[]> {
    const { data, error } = await clientSupabase
      .from('student_subjects')
      .select(
        `
        subjects!inner(id, name, code, school_id, applicable_to_levels, created_at)
      `
      )
      .eq('student_id', studentId)
      .order('subjects(name)', { ascending: true })

    if (error) throw new Error(`Failed to fetch student subjects: ${error.message}`)

    // Flatten the nested structure
    return (data || []).map((row: any) => row.subjects)
  }

  /**
   * Get a single subject by ID
   * Useful for displaying full subject details
   */
  static async getSubjectById(
    subjectId: string,
    schoolId: string
  ): Promise<CanonicalSubject | null> {
    const { data, error } = await clientSupabase
      .from('subjects')
      .select('id, name, code, school_id, applicable_to_levels, created_at')
      .eq('id', subjectId)
      .eq('school_id', schoolId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch subject: ${error.message}`)
    }

    return data || null
  }

  /**
   * Verify that a subject exists for a school
   * Use before using subject_id in assignments/registrations
   */
  static async verifySubjectExists(
    subjectId: string,
    schoolId: string
  ): Promise<boolean> {
    const subject = await this.getSubjectById(subjectId, schoolId)
    return !!subject
  }

  /**
   * Batch verify multiple subjects
   * Returns only the verified subject IDs
   */
  static async verifySubjectsExist(
    subjectIds: string[],
    schoolId: string
  ): Promise<string[]> {
    if (!subjectIds || subjectIds.length === 0) return []

    const { data, error } = await clientSupabase
      .from('subjects')
      .select('id')
      .eq('school_id', schoolId)
      .in('id', subjectIds)

    if (error) throw new Error(`Failed to verify subjects: ${error.message}`)

    return (data || []).map(s => s.id)
  }

  /**
   * Get subject statistics (usage count)
   * For admin dashboard and subject management
   */
  static async getSubjectStatistics(
    subjectId: string,
    schoolId: string
  ): Promise<SubjectWithStats | null> {
    const subject = await this.getSubjectById(subjectId, schoolId)
    if (!subject) return null

    const [
      { count: studentCount },
      { count: teacherCount },
      { count: scoreCount },
      { count: cbtCount },
    ] = await Promise.all([
      clientSupabase
        .from('student_subjects')
        .select('id', { count: 'exact' })
        .eq('subject_id', subjectId),
      clientSupabase
        .from('subject_teacher_assignments')
        .select('id', { count: 'exact' })
        .eq('subject_id', subjectId),
      clientSupabase
        .from('score_sheets')
        .select('id', { count: 'exact' })
        .eq('subject_id', subjectId),
      clientSupabase
        .from('cbt_exams')
        .select('id', { count: 'exact' })
        .eq('subject_id', subjectId),
    ])

    return {
      ...subject,
      student_count: studentCount || 0,
      teacher_count: teacherCount || 0,
      score_sheet_count: scoreCount || 0,
      cbt_exam_count: cbtCount || 0,
    }
  }

  /**
   * Filter subjects by multiple criteria
   * Used in advanced search/filtering scenarios
   */
  static async filterSubjects(
    schoolId: string,
    filters: {
      level?: number
      nameContains?: string
      codes?: string[]
      limit?: number
    }
  ): Promise<CanonicalSubject[]> {
    let query = clientSupabase
      .from('subjects')
      .select('id, name, code, school_id, applicable_to_levels, created_at')
      .eq('school_id', schoolId)

    if (filters.level !== undefined) {
      query = query.contains('applicable_to_levels', [filters.level])
    }

    if (filters.nameContains) {
      query = query.ilike('name', `%${filters.nameContains}%`)
    }

    if (filters.codes && filters.codes.length > 0) {
      query = query.in('code', filters.codes)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) throw new Error(`Failed to filter subjects: ${error.message}`)
    return data || []
  }

  /**
   * IMPORTANT: Get subjects by DISPLAY NAME (not ID)
   * This is ONLY for internal lookups, NOT for storing references
   * 
   * ALWAYS store subject_id (UUID) in database
   * ALWAYS display subject.name in UI
   * Use this method only for legacy compatibility
   */
  static async getSubjectIdByName(
    subjectName: string,
    schoolId: string
  ): Promise<string | null> {
    const { data, error } = await clientSupabase
      .from('subjects')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', subjectName)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get subject: ${error.message}`)
    }

    return data?.id || null
  }

  /**
   * Map class level (0-14) to human-readable class name
   * Example: 0 → "Nursery", 3 → "Primary 3", 12 → "SS1"
   */
  static getLevelLabel(level: number): string {
    const levelMap: Record<number, string> = {
      0: 'Nursery',
      1: 'Prep',
      2: 'Kindergarten',
      3: 'Primary 1',
      4: 'Primary 2',
      5: 'Primary 3',
      6: 'Primary 4',
      7: 'Primary 5',
      8: 'Primary 6',
      9: 'JSS1',
      10: 'JSS2',
      11: 'JSS3',
      12: 'SS1',
      13: 'SS2',
      14: 'SS3',
    }
    return levelMap[level] || `Level ${level}`
  }

  /**
   * Map section name to levels
   * Example: 'PRIMARY' → [3,4,5,6,7,8]
   */
  static getLevelsForSection(section: 'EARLY_YEARS' | 'PRIMARY' | 'JUNIOR_SECONDARY' | 'SENIOR_SECONDARY'): number[] {
    const sectionMap: Record<string, number[]> = {
      EARLY_YEARS: [0, 1, 2],
      PRIMARY: [3, 4, 5, 6, 7, 8],
      JUNIOR_SECONDARY: [9, 10, 11],
      SENIOR_SECONDARY: [12, 13, 14],
    }
    return sectionMap[section] || []
  }
}

export default CanonicalSubjectService
