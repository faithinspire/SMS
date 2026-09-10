import { createClient } from '@/lib/supabase-client'

const supabase = createClient()

export interface RegistrationClass {
  id: string
  name: string
  level: string
  type: 'PRIMARY' | 'SECONDARY'
}

export interface RegistrationArm {
  id: string
  name: string
}

export interface RegistrationStream {
  id: string
  name: string
}

export interface RegistrationSubject {
  id: string
  name: string
  code: string
  applicable_to_levels: (string | number)[]  // Can be strings or numbers
}

export interface ClassArmCombo {
  id: string
  class_id: string
  arm_id: string
  class: RegistrationClass
  arm: RegistrationArm
}

/**
 * Standard Nigerian Education Configuration
 * Used as fallback when school data is empty
 */
const NIGERIAN_CONFIG = {
  classes: [
    // PRIMARY - Early Years
    { name: 'Prep', level: 0, type: 'PRIMARY' },
    { name: 'Kindergarten', level: 1, type: 'PRIMARY' },
    { name: 'Nursery 1', level: 2, type: 'PRIMARY' },
    { name: 'Nursery 2', level: 3, type: 'PRIMARY' },
    { name: 'Nursery 3', level: 4, type: 'PRIMARY' },
    // PRIMARY - Main
    { name: 'Primary 1', level: 5, type: 'PRIMARY' },
    { name: 'Primary 2', level: 6, type: 'PRIMARY' },
    { name: 'Primary 3', level: 7, type: 'PRIMARY' },
    { name: 'Primary 4', level: 8, type: 'PRIMARY' },
    { name: 'Primary 5', level: 9, type: 'PRIMARY' },
    { name: 'Primary 6', level: 10, type: 'PRIMARY' },
    // SECONDARY - JSS
    { name: 'JSS 1', level: 11, type: 'SECONDARY' },
    { name: 'JSS 2', level: 12, type: 'SECONDARY' },
    { name: 'JSS 3', level: 13, type: 'SECONDARY' },
    // SECONDARY - SSS
    { name: 'SS 1', level: 14, type: 'SECONDARY' },
    { name: 'SS 2', level: 15, type: 'SECONDARY' },
    { name: 'SS 3', level: 16, type: 'SECONDARY' },
  ],
  arms: ['A', 'B', 'C', 'D'],
  subjects: [
    // PRIMARY subjects
    { name: 'English Language', code: 'ENG', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
    { name: 'Mathematics', code: 'MATH', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
    { name: 'Science', code: 'SCI', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
    { name: 'Social Studies', code: 'SS', levels: [0,1,2,3,4,5,6,7,8,9,10] },
    { name: 'Physical Education', code: 'PE', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
    { name: 'Fine Arts', code: 'ART', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] },
    { name: 'Computer Studies', code: 'CS', levels: [7,8,9,10,11,12,13,14,15,16] },
    { name: 'Home Economics', code: 'HE', levels: [5,6,7,8,9,10,11,12,13,14,15,16] },
    { name: 'Agricultural Science', code: 'AGR', levels: [7,8,9,10,11,12,13,14,15,16] },
    // SECONDARY - Science
    { name: 'Physics', code: 'PHY', levels: [11,12,13,14,15,16] },
    { name: 'Chemistry', code: 'CHM', levels: [11,12,13,14,15,16] },
    { name: 'Biology', code: 'BIO', levels: [11,12,13,14,15,16] },
    // SECONDARY - Languages & Humanities
    { name: 'Literature in English', code: 'LIT', levels: [11,12,13,14,15,16] },
    { name: 'Government', code: 'GOV', levels: [11,12,13,14,15,16] },
    { name: 'History', code: 'HIST', levels: [11,12,13,14,15,16] },
    { name: 'Geography', code: 'GEOG', levels: [11,12,13,14,15,16] },
    // SECONDARY - Commercial
    { name: 'Economics', code: 'ECO', levels: [11,12,13,14,15,16] },
    { name: 'Commerce', code: 'COM', levels: [11,12,13,14,15,16] },
    { name: 'Financial Accounting', code: 'ACC', levels: [11,12,13,14,15,16] },
    { name: 'Civic Education', code: 'CIV', levels: [7,8,9,10,11,12,13,14,15,16] },
    { name: 'Further Mathematics', code: 'FM', levels: [14,15,16] },
  ]
}

export class RegistrationConfigService {
  /**
   * Validate school ID before any query
   */
  private static validateSchoolId(schoolId: string): boolean {
    if (!schoolId || schoolId.trim() === '') {
      console.warn('⚠️ Empty school ID provided to RegistrationConfigService')
      return false
    }
    // Basic UUID validation (36 characters with hyphens)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(schoolId)) {
      console.warn(`⚠️ Invalid school ID format: ${schoolId}`)
      return false
    }
    return true
  }

  /**
   * Load all classes for a school, with fallback to Nigerian standard
   */
  static async getClasses(schoolId: string): Promise<RegistrationClass[]> {
    if (!this.validateSchoolId(schoolId)) {
      console.log('📚 Using standard Nigerian class configuration (fallback)')
      return NIGERIAN_CONFIG.classes.map((cls, idx) => ({
        id: `nigerian-${cls.level}`,
        name: cls.name,
        level: String(cls.level),
        type: cls.type,
      }))
    }

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, level, type')
        .eq('school_id', schoolId)
        .order('level')

      if (error) {
        console.warn('❌ Error loading school classes:', error.message)
        console.log('📚 Falling back to standard Nigerian classes')
        return NIGERIAN_CONFIG.classes.map((cls, idx) => ({
          id: `nigerian-${cls.level}`,
          name: cls.name,
          level: String(cls.level),
          type: cls.type,
        }))
      }

      if (!data || data.length === 0) {
        console.log('📚 School has no custom classes, using Nigerian standard')
        return NIGERIAN_CONFIG.classes.map((cls, idx) => ({
          id: `nigerian-${cls.level}`,
          name: cls.name,
          level: String(cls.level),
          type: cls.type,
        }))
      }

      return data
    } catch (err) {
      console.error('❌ Exception loading classes:', err)
      return NIGERIAN_CONFIG.classes.map((cls) => ({
        id: `nigerian-${cls.level}`,
        name: cls.name,
        level: String(cls.level),
        type: cls.type,
      }))
    }
  }

  /**
   * Load all arms for a school
   */
  static async getArms(schoolId: string): Promise<RegistrationArm[]> {
    if (!this.validateSchoolId(schoolId)) {
      return NIGERIAN_CONFIG.arms.map((arm, idx) => ({
        id: `nigerian-arm-${idx}`,
        name: arm,
      }))
    }

    try {
      const { data, error } = await supabase
        .from('arms')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name')

      if (error || !data || data.length === 0) {
        console.log('🎯 Using standard arms (A, B, C, D)')
        return NIGERIAN_CONFIG.arms.map((arm, idx) => ({
          id: `nigerian-arm-${idx}`,
          name: arm,
        }))
      }

      return data
    } catch (err) {
      console.error('❌ Exception loading arms:', err)
      return NIGERIAN_CONFIG.arms.map((arm, idx) => ({
        id: `nigerian-arm-${idx}`,
        name: arm,
      }))
    }
  }

  /**
   * Load all streams for a school
   */
  static async getStreams(schoolId: string): Promise<RegistrationStream[]> {
    if (!this.validateSchoolId(schoolId)) {
      return []
    }

    try {
      const { data, error } = await supabase
        .from('streams')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name')

      if (error) {
        console.warn('❌ Error loading streams:', error.message)
        return []
      }

      return data || []
    } catch (err) {
      console.error('❌ Exception loading streams:', err)
      return []
    }
  }

  /**
   * Load all subjects for a school, with fallback to Nigerian standard
   */
  static async getSubjects(schoolId: string): Promise<RegistrationSubject[]> {
    if (!this.validateSchoolId(schoolId)) {
      console.log('📖 Using standard Nigerian subject configuration (fallback)')
      return NIGERIAN_CONFIG.subjects.map((subj) => ({
        id: `nigerian-${subj.code.toLowerCase()}`,
        name: subj.name,
        code: subj.code,
        applicable_to_levels: subj.levels,
      }))
    }

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code, applicable_to_levels')
        .eq('school_id', schoolId)
        .order('name')

      if (error) {
        console.warn('❌ Error loading school subjects:', error.message)
        console.log('📖 Falling back to standard Nigerian subjects')
        return NIGERIAN_CONFIG.subjects.map((subj) => ({
          id: `nigerian-${subj.code.toLowerCase()}`,
          name: subj.name,
          code: subj.code,
          applicable_to_levels: subj.levels,
        }))
      }

      if (!data || data.length === 0) {
        console.log('📖 School has no custom subjects, using Nigerian standard')
        return NIGERIAN_CONFIG.subjects.map((subj) => ({
          id: `nigerian-${subj.code.toLowerCase()}`,
          name: subj.name,
          code: subj.code,
          applicable_to_levels: subj.levels,
        }))
      }

      return data
    } catch (err) {
      console.error('❌ Exception loading subjects:', err)
      return NIGERIAN_CONFIG.subjects.map((subj) => ({
        id: `nigerian-${subj.code.toLowerCase()}`,
        name: subj.name,
        code: subj.code,
        applicable_to_levels: subj.levels,
      }))
    }
  }

  /**
   * Load class-arm combinations with joined data
   * Supports both real database combos and fallback generation
   */
  static async getClassArmCombos(schoolId: string, classType?: 'PRIMARY' | 'SECONDARY'): Promise<ClassArmCombo[]> {
    if (!this.validateSchoolId(schoolId)) {
      console.log('🔗 Generating standard class-arm combinations (fallback)')
      // Generate combos from Nigerian standard
      const combos: ClassArmCombo[] = []
      const classes = NIGERIAN_CONFIG.classes.filter(c => !classType || c.type === classType)
      const arms = NIGERIAN_CONFIG.arms
      
      classes.forEach((cls, clsIdx) => {
        arms.forEach((arm, armIdx) => {
          combos.push({
            id: `nigerian-combo-${clsIdx}-${armIdx}`,
            class_id: `nigerian-${cls.level}`,
            arm_id: `nigerian-arm-${armIdx}`,
            class: {
              id: `nigerian-${cls.level}`,
              name: cls.name,
              level: String(cls.level),
              type: cls.type,
            },
            arm: {
              id: `nigerian-arm-${armIdx}`,
              name: arm,
            },
          })
        })
      })
      return combos
    }

    try {
      const { data, error } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          class_id,
          arm_id,
          classes (id, name, level, type),
          arms (id, name)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: true })

      if (error) {
        console.warn('❌ Error loading class-arm combos:', error.message)
        console.log('🔗 Generating standard combinations (fallback)')
        // Fallback
        const combos: ClassArmCombo[] = []
        const classes = NIGERIAN_CONFIG.classes
        const arms = NIGERIAN_CONFIG.arms
        
        classes.forEach((cls, clsIdx) => {
          arms.forEach((arm, armIdx) => {
            combos.push({
              id: `nigerian-combo-${clsIdx}-${armIdx}`,
              class_id: `nigerian-${cls.level}`,
              arm_id: `nigerian-arm-${armIdx}`,
              class: {
                id: `nigerian-${cls.level}`,
                name: cls.name,
                level: String(cls.level),
                type: cls.type,
              },
              arm: {
                id: `nigerian-arm-${armIdx}`,
                name: arm,
              },
            })
          })
        })
        return combos
      }

      if (!data || data.length === 0) {
        console.log('🔗 School has no class-arm combos, using Nigerian standard')
        // Generate from Nigerian standard
        const combos: ClassArmCombo[] = []
        const classes = NIGERIAN_CONFIG.classes
        const arms = NIGERIAN_CONFIG.arms
        
        classes.forEach((cls, clsIdx) => {
          arms.forEach((arm, armIdx) => {
            combos.push({
              id: `nigerian-combo-${clsIdx}-${armIdx}`,
              class_id: `nigerian-${cls.level}`,
              arm_id: `nigerian-arm-${armIdx}`,
              class: {
                id: `nigerian-${cls.level}`,
                name: cls.name,
                level: String(cls.level),
                type: cls.type,
              },
              arm: {
                id: `nigerian-arm-${armIdx}`,
                name: arm,
              },
            })
          })
        })
        return combos
      }

      // Filter by class type if specified
      let results = data as any[]
      if (classType) {
        results = results.filter(combo => combo.classes?.type === classType)
      }

      return results
    } catch (err) {
      console.error('❌ Exception loading class-arm combos:', err)
      // Fallback
      const combos: ClassArmCombo[] = []
      const classes = NIGERIAN_CONFIG.classes
      const arms = NIGERIAN_CONFIG.arms
      
      classes.forEach((cls, clsIdx) => {
        arms.forEach((arm, armIdx) => {
          combos.push({
            id: `nigerian-combo-${clsIdx}-${armIdx}`,
            class_id: `nigerian-${cls.level}`,
            arm_id: `nigerian-arm-${armIdx}`,
            class: {
              id: `nigerian-${cls.level}`,
              name: cls.name,
              level: String(cls.level),
              type: cls.type,
            },
            arm: {
              id: `nigerian-arm-${armIdx}`,
              name: arm,
            },
          })
        })
      })
      return combos
    }
  }

  /**
   * Filter subjects by applicable levels
   */
  static filterSubjectsByLevel(subjects: RegistrationSubject[], level: string | number): RegistrationSubject[] {
    const levelStr = String(level)
    const levelNum = Number(level)
    
    return subjects.filter(subject => {
      if (!subject.applicable_to_levels || subject.applicable_to_levels.length === 0) {
        return false
      }
      
      return subject.applicable_to_levels.some(l => 
        String(l) === levelStr || Number(l) === levelNum
      )
    })
  }

  /**
   * Get all combo data at once for faster loading
   */
  static async getAllComboData(schoolId: string) {
    try {
      const [classes, arms, streams, subjects, combos] = await Promise.all([
        this.getClasses(schoolId),
        this.getArms(schoolId),
        this.getStreams(schoolId),
        this.getSubjects(schoolId),
        this.getClassArmCombos(schoolId),
      ])

      return {
        classes,
        arms,
        streams,
        subjects,
        combos,
        stats: {
          classCount: classes.length,
          armCount: arms.length,
          streamCount: streams.length,
          subjectCount: subjects.length,
          comboCount: combos.length,
        }
      }
    } catch (err) {
      console.error('❌ Error loading combo data:', err)
      // Return Nigerian standard as complete fallback
      const classes = NIGERIAN_CONFIG.classes.map((cls) => ({
        id: `nigerian-${cls.level}`,
        name: cls.name,
        level: String(cls.level),
        type: cls.type,
      }))
      const arms = NIGERIAN_CONFIG.arms.map((arm, idx) => ({
        id: `nigerian-arm-${idx}`,
        name: arm,
      }))
      const subjects = NIGERIAN_CONFIG.subjects.map((subj) => ({
        id: `nigerian-${subj.code.toLowerCase()}`,
        name: subj.name,
        code: subj.code,
        applicable_to_levels: subj.levels,
      }))

      const combos: ClassArmCombo[] = []
      classes.forEach((cls, clsIdx) => {
        arms.forEach((arm, armIdx) => {
          combos.push({
            id: `nigerian-combo-${clsIdx}-${armIdx}`,
            class_id: cls.id,
            arm_id: arm.id,
            class: cls,
            arm: arm,
          })
        })
      })

      return {
        classes,
        arms,
        streams: [],
        subjects,
        combos,
        stats: {
          classCount: classes.length,
          armCount: arms.length,
          streamCount: 0,
          subjectCount: subjects.length,
          comboCount: combos.length,
        }
      }
    }
  }
}
