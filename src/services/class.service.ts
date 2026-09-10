import { supabase } from '@/lib/supabase-client'

export interface Class {
  id: string
  schoolId: string
  name: string
  level: number | string
  type: 'PRIMARY' | 'SECONDARY'
  createdAt: string
}

export interface Arm {
  id: string
  classId: string
  schoolId: string
  name: string
  createdAt: string
}

export interface ClassArmCombo {
  id: string
  class_id: string
  arm_id: string
  classes: { id: string; name: string; level: number | string; type: string }
  arms: { id: string; name: string }
}

export interface Subject {
  id: string
  schoolId: string
  name: string
  code: string
  applicable_to_levels: (string | number)[]
  createdAt: string
}

export class ClassService {
  /**
   * Get all classes for a school
   */
  static async getClasses(schoolId: string): Promise<Class[]> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching classes:', error)
      return []
    }
  }

  /**
   * Get all arms for a school
   */
  static async getArms(schoolId: string): Promise<Arm[]> {
    try {
      const { data, error } = await supabase
        .from('arms')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching arms:', error)
      return []
    }
  }

  /**
   * Get all class-arm combinations for a school with nested data
   */
  static async getClassArmCombos(schoolId: string): Promise<ClassArmCombo[]> {
    try {
      const { data, error } = await supabase
        .from('class_arm_combos')
        .select(
          `
          id,
          class_id,
          arm_id,
          classes (id, name, level, type),
          arms (id, name)
        `
        )
        .eq('school_id', schoolId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching class-arm combos:', error)
      return []
    }
  }

  /**
   * Get all subjects for a school
   */
  static async getSubjects(schoolId: string): Promise<Subject[]> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching subjects:', error)
      return []
    }
  }

  /**
   * Get subjects applicable to a specific class level
   */
  static async getSubjectsForLevel(schoolId: string, level: number | string): Promise<Subject[]> {
    try {
      const levelStr = String(level)
      const levelNum = Number(level)

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })

      if (error) throw error

      // Filter by applicable levels
      const filtered = (data || []).filter(subject => {
        if (!subject.applicable_to_levels || !Array.isArray(subject.applicable_to_levels)) {
          return false
        }
        return subject.applicable_to_levels.some((l: any) =>
          String(l) === levelStr || Number(l) === levelNum
        )
      })

      return filtered
    } catch (error) {
      console.error('Error fetching subjects for level:', error)
      return []
    }
  }

  /**
   * Get school classes with their arms and combos
   * Returns structure: [{classes: Class, arms: [Arm], class_arm_combos: [Combo]}]
   */
  static async getSchoolClasses(schoolId: string): Promise<any[]> {
    try {
      const classes = await this.getClasses(schoolId)
      const combos = await this.getClassArmCombos(schoolId)

      // Group combos by class
      const classesById = new Map<string, any>()

      for (const combo of combos) {
        const classId = combo.class_id
        if (!classesById.has(classId)) {
          const classData = classes.find(c => c.id === classId)
          classesById.set(classId, {
            id: classId,
            name: classData?.name || '',
            level: classData?.level || '',
            type: classData?.type || '',
            arms: [] as any[],
            class_arm_combos: [] as any[],
          })
        }

        const classEntry = classesById.get(classId)
        const armName = combo.arms?.name || ''

        // Add unique arm
        if (!classEntry.arms.some((a: any) => a.id === combo.arm_id)) {
          classEntry.arms.push({
            id: combo.arm_id,
            name: armName,
          })
        }

        // Add combo
        classEntry.class_arm_combos.push({
          id: combo.id,
          class_id: combo.class_id,
          arm_id: combo.arm_id,
        })
      }

      return Array.from(classesById.values())
    } catch (error) {
      console.error('Error fetching school classes:', error)
      return []
    }
  }

  /**
   * Get a single class-arm combo with all data
   */
  static async getClassArmCombo(comboId: string): Promise<ClassArmCombo | null> {
    try {
      const { data, error } = await supabase
        .from('class_arm_combos')
        .select(
          `
          id,
          class_id,
          arm_id,
          classes (id, name, level, type),
          arms (id, name)
        `
        )
        .eq('id', comboId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching class-arm combo:', error)
      return null
    }
  }

  /**
   * Get all students in a specific class-arm combo with their subjects
   */
  static async getClassStudents(classArmComboId: string, schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(
          `
          id,
          admission_number,
          users (id, full_name, email, photo_url),
          student_subjects (id, subject_id, subjects (id, name, code))
        `
        )
        .eq('class_arm_combo_id', classArmComboId)
        .eq('school_id', schoolId)
        .order('admission_number', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching class students:', error)
      return []
    }
  }
}
