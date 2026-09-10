/**
 * REGISTRATION DIAGNOSTIC SERVICE
 * Traces the ENTIRE data pipeline for teacher/student registration
 * Helps identify where data is disappearing or queries are failing
 */

import { createClient } from '@/lib/supabase-client'

interface DiagnosticResult {
  timestamp: string
  schoolId: string
  stage: string
  status: 'OK' | 'ERROR' | 'EMPTY'
  message: string
  data?: any
  error?: string
}

const diagnosticResults: DiagnosticResult[] = []

export const RegistrationDiagnosticService = {
  /**
   * Trace the complete data pipeline for a school
   */
  async traceDataPipeline(schoolId: string) {
    diagnosticResults.length = 0 // Clear previous results

    if (!schoolId) {
      this.logResult('INIT', 'ERROR', '❌ schoolId is undefined or empty')
      return diagnosticResults
    }

    this.logResult('INIT', 'OK', `✅ schoolId received: ${schoolId}`)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        this.logResult('SUPABASE_CONFIG', 'ERROR', '❌ Supabase config missing')
        return diagnosticResults
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // STAGE 1: Check if school exists
      await this.checkSchoolExists(supabase, schoolId)

      // STAGE 2: Check classes
      await this.checkClasses(supabase, schoolId)

      // STAGE 3: Check arms
      await this.checkArms(supabase, schoolId)

      // STAGE 4: Check class_arm_combos
      await this.checkClassArmCombos(supabase, schoolId)

      // STAGE 5: Check subjects
      await this.checkSubjects(supabase, schoolId)

      // STAGE 6: Check teacher assignments
      await this.checkTeacherAssignments(supabase, schoolId)

      // STAGE 7: Check student assignments
      await this.checkStudentAssignments(supabase, schoolId)
    } catch (err: any) {
      this.logResult('EXCEPTION', 'ERROR', `❌ ${err.message}`)
    }

    return diagnosticResults
  },

  async checkSchoolExists(supabase: any, schoolId: string) {
    try {
      const { data, error, count } = await supabase
        .from('schools')
        .select('id, name', { count: 'exact' })
        .eq('id', schoolId)

      if (error) {
        this.logResult('SCHOOL_CHECK', 'ERROR', `❌ Query failed: ${error.message}`, null, error)
      } else if (!data || data.length === 0) {
        this.logResult('SCHOOL_CHECK', 'EMPTY', `❌ School not found with id: ${schoolId}`)
      } else {
        this.logResult('SCHOOL_CHECK', 'OK', `✅ School exists: ${data[0].name}`, data[0])
      }
    } catch (err: any) {
      this.logResult('SCHOOL_CHECK', 'ERROR', `❌ Exception: ${err.message}`, null, err)
    }
  },

  async checkClasses(supabase: any, schoolId: string) {
    try {
      const { data, error, count } = await supabase
        .from('classes')
        .select('id, name, level, type', { count: 'exact' })
        .eq('school_id', schoolId)

      if (error) {
        this.logResult('CLASSES', 'ERROR', `❌ Query failed: ${error.message}`, null, error)
      } else if (!data || data.length === 0) {
        this.logResult('CLASSES', 'EMPTY', `⚠️  No classes found (count: ${count || 0})`)
      } else {
        this.logResult('CLASSES', 'OK', `✅ Found ${data.length} classes`, {
          count: data.length,
          sample: data.slice(0, 3),
        })
      }
    } catch (err: any) {
      this.logResult('CLASSES', 'ERROR', `❌ Exception: ${err.message}`, null, err)
    }
  },

  async checkArms(supabase: any, schoolId: string) {
    try {
      const { data, error, count } = await supabase
        .from('arms')
        .select('id, name, class_id', { count: 'exact' })
        .eq('school_id', schoolId)

      if (error) {
        this.logResult('ARMS', 'ERROR', `❌ Query failed: ${error.message}`, null, error)
      } else if (!data || data.length === 0) {
        this.logResult('ARMS', 'EMPTY', `⚠️  No arms found (count: ${count || 0})`)
      } else {
        this.logResult('ARMS', 'OK', `✅ Found ${data.length} arms`, {
          count: data.length,
          sample: data.slice(0, 3),
        })
      }
    } catch (err: any) {
      this.logResult('ARMS', 'ERROR', `❌ Exception: ${err.message}`, null, err)
    }
  },

  async checkClassArmCombos(supabase: any, schoolId: string) {
    try {
      const { data, error, count } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          class_id,
          arm_id,
          classes:class_id (id, name, level, type),
          arms:arm_id (id, name)
        `, { count: 'exact' })
        .eq('school_id', schoolId)

      if (error) {
        this.logResult('CLASS_ARM_COMBOS', 'ERROR', `❌ Query failed: ${error.message}`, null, error)
      } else if (!data || data.length === 0) {
        this.logResult('CLASS_ARM_COMBOS', 'EMPTY', `⚠️  No combos found (count: ${count || 0})`)
      } else {
        this.logResult('CLASS_ARM_COMBOS', 'OK', `✅ Found ${data.length} class-arm combos`, {
          count: data.length,
          sample: data.slice(0, 3),
        })
      }
    } catch (err: any) {
      this.logResult('CLASS_ARM_COMBOS', 'ERROR', `❌ Exception: ${err.message}`, null, err)
    }
  },

  async checkSubjects(supabase: any, schoolId: string) {
    try {
      const { data, error, count } = await supabase
        .from('subjects')
        .select('id, name, code, applicable_to_levels', { count: 'exact' })
        .eq('school_id', schoolId)

      if (error) {
        this.logResult('SUBJECTS', 'ERROR', `❌ Query failed: ${error.message}`, null, error)
      } else if (!data || data.length === 0) {
        this.logResult('SUBJECTS', 'EMPTY', `⚠️  No subjects found (count: ${count || 0})`)
      } else {
        this.logResult('SUBJECTS', 'OK', `✅ Found ${data.length} subjects`, {
          count: data.length,
          sample: data.slice(0, 5),
        })
      }
    } catch (err: any) {
      this.logResult('SUBJECTS', 'ERROR', `❌ Exception: ${err.message}`, null, err)
    }
  },

  async checkTeacherAssignments(supabase: any, schoolId: string) {
    try {
      const { data, error, count } = await supabase
        .from('subject_teacher_assignments')
        .select('id, subject_id, teacher_id, class_arm_combo_id', { count: 'exact' })
        .eq('school_id', schoolId)

      if (error) {
        this.logResult('TEACHER_ASSIGNMENTS', 'ERROR', `❌ Query failed: ${error.message}`, null, error)
      } else if (!data || data.length === 0) {
        this.logResult('TEACHER_ASSIGNMENTS', 'EMPTY', `⚠️  No teacher assignments found (count: ${count || 0})`)
      } else {
        this.logResult('TEACHER_ASSIGNMENTS', 'OK', `✅ Found ${data.length} teacher assignments`, {
          count: data.length,
          sample: data.slice(0, 3),
        })
      }
    } catch (err: any) {
      this.logResult('TEACHER_ASSIGNMENTS', 'ERROR', `❌ Exception: ${err.message}`, null, err)
    }
  },

  async checkStudentAssignments(supabase: any, schoolId: string) {
    try {
      const { data, error, count } = await supabase
        .from('student_subjects')
        .select('id, student_id, subject_id, subject_teacher_id', { count: 'exact' })
        .eq('school_id', schoolId)

      if (error) {
        this.logResult('STUDENT_ASSIGNMENTS', 'ERROR', `❌ Query failed: ${error.message}`, null, error)
      } else if (!data || data.length === 0) {
        this.logResult('STUDENT_ASSIGNMENTS', 'EMPTY', `⚠️  No student assignments found (count: ${count || 0})`)
      } else {
        this.logResult('STUDENT_ASSIGNMENTS', 'OK', `✅ Found ${data.length} student assignments`, {
          count: data.length,
          sample: data.slice(0, 3),
        })
      }
    } catch (err: any) {
      this.logResult('STUDENT_ASSIGNMENTS', 'ERROR', `❌ Exception: ${err.message}`, null, err)
    }
  },

  private logResult(stage: string, status: 'OK' | 'ERROR' | 'EMPTY', message: string, data?: any, error?: any) {
    const result: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      schoolId: '',
      stage,
      status,
      message,
      data,
      error: error ? JSON.stringify(error) : undefined,
    }
    diagnosticResults.push(result)
    console.log(`[DIAGNOSTIC ${stage}] ${message}`, data)
  },

  /**
   * Get all diagnostic results
   */
  getResults() {
    return diagnosticResults
  },

  /**
   * Get formatted diagnostic report
   */
  getReport() {
    const report = diagnosticResults
      .map((r) => `${r.stage}: ${r.status} - ${r.message}`)
      .join('\n')
    return report
  },

  /**
   * Check if data pipeline is complete
   */
  isHealthy() {
    return (
      diagnosticResults.some((r) => r.stage === 'CLASSES' && r.status === 'OK') &&
      diagnosticResults.some((r) => r.stage === 'SUBJECTS' && r.status === 'OK') &&
      diagnosticResults.some((r) => r.stage === 'CLASS_ARM_COMBOS' && r.status === 'OK')
    )
  },
}
