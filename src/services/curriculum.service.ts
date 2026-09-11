/**
 * Curriculum Service
 * 
 * Handles subject catalogue and level-based subject filtering
 * Implements Nigerian NERDC curriculum structure:
 * - JSS1-3: Levels 9-11
 * - SS1-3: Levels 12-14
 */

import { supabase } from '@/lib/supabase-client'

export interface Subject {
  id: string
  name: string
  code: string
  section: string
  is_active: boolean
  compulsory: boolean
  subject_category: string
  applicable_to_levels: number[]
}

export interface ClassLevel {
  level: number
  name: string
  type: 'JUNIOR_SECONDARY' | 'SENIOR_SECONDARY'
}

// Map class names to levels
const CLASS_LEVEL_MAP: Record<string, ClassLevel> = {
  'JSS1': { level: 9, name: 'JSS 1', type: 'JUNIOR_SECONDARY' },
  'JSS 1': { level: 9, name: 'JSS 1', type: 'JUNIOR_SECONDARY' },
  'JSS2': { level: 10, name: 'JSS 2', type: 'JUNIOR_SECONDARY' },
  'JSS 2': { level: 10, name: 'JSS 2', type: 'JUNIOR_SECONDARY' },
  'JSS3': { level: 11, name: 'JSS 3', type: 'JUNIOR_SECONDARY' },
  'JSS 3': { level: 11, name: 'JSS 3', type: 'JUNIOR_SECONDARY' },
  'SS1': { level: 12, name: 'SS 1', type: 'SENIOR_SECONDARY' },
  'SS 1': { level: 12, name: 'SS 1', type: 'SENIOR_SECONDARY' },
  'SS2': { level: 13, name: 'SS 2', type: 'SENIOR_SECONDARY' },
  'SS 2': { level: 13, name: 'SS 2', type: 'SENIOR_SECONDARY' },
  'SS3': { level: 14, name: 'SS 3', type: 'SENIOR_SECONDARY' },
  'SS 3': { level: 14, name: 'SS 3', type: 'SENIOR_SECONDARY' },
}

export class CurriculumService {
  /**
   * Get class level from class name
   */
  static getClassLevel(className: string): ClassLevel | null {
    return CLASS_LEVEL_MAP[className] || null
  }

  /**
   * Get all subjects applicable to a specific level
   */
  static async getSubjectsByLevel(
    schoolId: string,
    level: number,
    onlyActive: boolean = true
  ): Promise<Subject[]> {
    try {
      const query = supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .contains('applicable_to_levels', [level])

      if (onlyActive) {
        query.eq('is_active', true)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (error) throw error
      return data as Subject[]
    } catch (err) {
      console.error('Error fetching subjects by level:', err)
      return []
    }
  }

  /**
   * Get subjects by class name (e.g., "JSS1", "SS2")
   */
  static async getSubjectsByClassName(
    schoolId: string,
    className: string,
    onlyActive: boolean = true
  ): Promise<Subject[]> {
    const classLevel = this.getClassLevel(className)
    if (!classLevel) {
      console.warn(`Unknown class name: ${className}`)
      return []
    }

    return this.getSubjectsByLevel(schoolId, classLevel.level, onlyActive)
  }

  /**
   * Get only compulsory/core subjects for a level
   */
  static async getCoreSubjectsByLevel(
    schoolId: string,
    level: number
  ): Promise<Subject[]> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .contains('applicable_to_levels', [level])
        .eq('compulsory', true)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Subject[]
    } catch (err) {
      console.error('Error fetching core subjects:', err)
      return []
    }
  }

  /**
   * Get optional/elective subjects for a level
   */
  static async getElectiveSubjectsByLevel(
    schoolId: string,
    level: number
  ): Promise<Subject[]> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .contains('applicable_to_levels', [level])
        .eq('compulsory', false)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Subject[]
    } catch (err) {
      console.error('Error fetching elective subjects:', err)
      return []
    }
  }

  /**
   * Get subjects by category (e.g., LANGUAGE, SCIENCE, BUSINESS_STREAM)
   */
  static async getSubjectsByCategory(
    schoolId: string,
    level: number,
    category: string
  ): Promise<Subject[]> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .contains('applicable_to_levels', [level])
        .eq('subject_category', category)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Subject[]
    } catch (err) {
      console.error('Error fetching subjects by category:', err)
      return []
    }
  }

  /**
   * Determine if two levels should use the same subject pool
   * Used for validation when assigning subjects
   */
  static areLevelsCompatible(level1: number, level2: number): boolean {
    // JSS levels: 9, 10, 11
    // SS levels: 12, 13, 14
    const isJSS = (level: number) => level >= 9 && level <= 11
    const isSS = (level: number) => level >= 12 && level <= 14

    return (isJSS(level1) && isJSS(level2)) || (isSS(level1) && isSS(level2))
  }

  /**
   * Get all stream types available for a given level
   */
  static async getAvailableStreams(
    schoolId: string,
    level: number
  ): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('subject_category')
        .eq('school_id', schoolId)
        .contains('applicable_to_levels', [level])
        .eq('is_active', true)
        .like('subject_category', '%_STREAM')

      if (error) throw error

      // Extract unique stream categories
      const streams = [
        ...new Set(data.map((row) => row.subject_category)),
      ].filter((category) => category.endsWith('_STREAM'))

      return streams
    } catch (err) {
      console.error('Error fetching available streams:', err)
      return []
    }
  }

  /**
   * Verify subjects match student's level
   */
  static async verifySubjectsForLevel(
    schoolId: string,
    level: number,
    subjectIds: string[]
  ): Promise<{ valid: boolean; invalidSubjects: string[] }> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, applicable_to_levels')
        .eq('school_id', schoolId)
        .in('id', subjectIds)

      if (error) throw error

      const invalidSubjects: string[] = []

      for (const subject of data) {
        if (!subject.applicable_to_levels.includes(level)) {
          invalidSubjects.push(subject.name)
        }
      }

      return {
        valid: invalidSubjects.length === 0,
        invalidSubjects,
      }
    } catch (err) {
      console.error('Error verifying subjects:', err)
      return { valid: false, invalidSubjects: [] }
    }
  }

  /**
   * Get JSS/SS classification for a level
   */
  static getLevelType(level: number): 'JSS' | 'SS' | 'UNKNOWN' {
    if (level >= 9 && level <= 11) return 'JSS'
    if (level >= 12 && level <= 14) return 'SS'
    return 'UNKNOWN'
  }

  /**
   * Get level year (1, 2, 3) from absolute level
   */
  static getLevelYear(level: number): number | null {
    const levelMap: Record<number, number> = {
      9: 1,  // JSS1
      10: 2, // JSS2
      11: 3, // JSS3
      12: 1, // SS1
      13: 2, // SS2
      14: 3, // SS3
    }
    return levelMap[level] || null
  }
}
