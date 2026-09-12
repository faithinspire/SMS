/**
 * RegistrationConfigService
 * Loads all configuration data for student/teacher registration
 * - Classes and arms by section
 * - Streams (for SS1/SS2/SS3)
 * - Subjects by school and applicable levels
 * - All filtered by school_id for multi-tenancy
 */

import { supabase } from '@/lib/supabase-client'

export interface RegistrationClass {
  id: string
  name: string
  level: number
  type: 'PRIMARY' | 'SECONDARY'
}

export interface RegistrationArm {
  id: string
  name: string
  capacity: number
}

export interface ClassArmCombo {
  id: string
  class_id: string
  arm_id: string
  classes: RegistrationClass
  arms: RegistrationArm
}

export interface Stream {
  id: string
  name: string
}

export interface Subject {
  id: string
  name: string
  code: string
  applicable_to_levels: number[]
}

export class RegistrationConfigService {
  /**
   * Get all classes for a school and section
   */
  static async getClasses(
    schoolId: string,
    section?: 'PRIMARY' | 'SECONDARY'
  ): Promise<RegistrationClass[]> {
    try {
      console.log(`📚 Loading classes for school ${schoolId}, section ${section || 'ALL'}`)

      let query = supabase
        .from('classes')
        .select('id, name, level, type')
        .eq('school_id', schoolId)

      if (section) {
        query = query.eq('type', section)
      }

      const { data, error } = await query.order('level', { ascending: true })

      if (error) {
        console.error('❌ Error loading classes:', error)
        throw error
      }

      console.log(`✅ Loaded ${data?.length || 0} classes`)
      return data || []
    } catch (err: any) {
      console.error('❌ Exception loading classes:', err)
      throw err
    }
  }

  /**
   * Get all arms for a class
   */
  static async getArms(classId: string): Promise<RegistrationArm[]> {
    try {
      console.log(`🏛️  Loading arms for class ${classId}`)

      const { data, error } = await supabase
        .from('arms')
        .select('id, name, capacity')
        .eq('class_id', classId)
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ Error loading arms:', error)
        throw error
      }

      console.log(`✅ Loaded ${data?.length || 0} arms`)
      return data || []
    } catch (err: any) {
      console.error('❌ Exception loading arms:', err)
      throw err
    }
  }

  /**
   * Get all class-arm combinations for a school and section
   * Returns full objects with nested class and arm data
   */
  static async getClassArmCombos(
    schoolId: string,
    section?: 'PRIMARY' | 'SECONDARY'
  ): Promise<ClassArmCombo[]> {
    try {
      console.log(`🔗 Loading class-arm combos for ${schoolId}, section ${section || 'ALL'}`)

      let query = supabase
        .from('class_arm_combos')
        .select(`
          id,
          class_id,
          arm_id,
          classes: class_id (id, name, level, type),
          arms: arm_id (id, name, capacity)
        `)
        .eq('school_id', schoolId)

      // Filter by section if provided
      if (section) {
        query = query.eq('classes.type', section)
      }

      const { data, error } = await query.order('classes.level', { ascending: true })

      if (error) {
        console.error('❌ Error loading class-arm combos:', error)
        throw error
      }

      console.log(`✅ Loaded ${data?.length || 0} class-arm combos`)
      return (data || []) as ClassArmCombo[]
    } catch (err: any) {
      console.error('❌ Exception loading class-arm combos:', err)
      throw err
    }
  }

  /**
   * Get streams for a class (for SS1/SS2/SS3)
   */
  static async getStreams(classId: string): Promise<Stream[]> {
    try {
      console.log(`🌊 Loading streams for class ${classId}`)

      const { data, error } = await supabase
        .from('streams')
        .select('id, name')
        .eq('class_id', classId)
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ Error loading streams:', error)
        throw error
      }

      console.log(`✅ Loaded ${data?.length || 0} streams`)
      return data || []
    } catch (err: any) {
      console.error('❌ Exception loading streams:', err)
      throw err
    }
  }

  /**
   * Get all subjects for a school
   * Returns full subject objects with applicable levels
   */
  static async getSubjectsForSchool(schoolId: string): Promise<Subject[]> {
    try {
      console.log(`📖 Loading subjects for school ${schoolId}`)

      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code, applicable_to_levels')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ Error loading subjects:', error)
        throw error
      }

      console.log(`✅ Loaded ${data?.length || 0} subjects`)
      return data || []
    } catch (err: any) {
      console.error('❌ Exception loading subjects:', err)
      throw err
    }
  }

  /**
   * Get subjects applicable to specific class levels
   */
  static async getSubjectsForLevels(
    schoolId: string,
    levels: number[]
  ): Promise<Subject[]> {
    try {
      console.log(`📖 Loading subjects for levels ${levels.join(', ')}`)

      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code, applicable_to_levels')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ Error loading subjects:', error)
        throw error
      }

      // Filter by applicable levels
      const filtered = (data || []).filter((subject: Subject) =>
        levels.some((level) => subject.applicable_to_levels.includes(level))
      )

      console.log(`✅ Loaded ${filtered.length} applicable subjects`)
      return filtered
    } catch (err: any) {
      console.error('❌ Exception loading subjects:', err)
      throw err
    }
  }

  /**
   * Get all academic terms for a school (for the current session)
   */
  static async getAcademicTerms(schoolId: string): Promise<any[]> {
    try {
      console.log(`📅 Loading academic terms for ${schoolId}`)

      const { data: sessions, error: sessionError } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .single()

      if (sessionError || !sessions) {
        console.warn('⚠️ No active academic session found, terms may not be available')
        return []
      }

      const { data, error } = await supabase
        .from('academic_terms')
        .select('id, term_name, term_order, start_date, end_date')
        .eq('session_id', sessions.id)
        .eq('is_active', true)
        .order('term_order', { ascending: true })

      if (error) {
        console.error('❌ Error loading academic terms:', error)
        throw error
      }

      console.log(`✅ Loaded ${data?.length || 0} academic terms`)
      return data || []
    } catch (err: any) {
      console.error('❌ Exception loading academic terms:', err)
      throw err
    }
  }
}
