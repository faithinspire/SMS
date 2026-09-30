/**
 * Academic Service - Centralized academic data queries
 * Handles Session → Term → Class → Class Arm dependency chains
 * Ensures consistent data retrieval across all pages
 */

import { supabase } from '@/lib/supabase-client'

export class AcademicService {
  /**
   * Get all academic sessions for a school, ordered by most recent
   */
  static async getSessions(schoolId: string) {
    const { data, error } = await supabase
      .from('academic_sessions')
      .select('id, session_year, is_active, created_at')
      .eq('school_id', schoolId)
      .order('session_year', { ascending: false })

    if (error) throw new Error(`Failed to fetch sessions: ${error.message}`)
    return data || []
  }

  /**
   * Get all terms for a school
   */
  static async getTerms(schoolId: string) {
    const { data, error } = await supabase
      .from('academic_terms')
      .select('id, session_id, term_name, term_number, is_active, school_id')
      .eq('school_id', schoolId)
      .order('term_number', { ascending: true })

    if (error) throw new Error(`Failed to fetch terms: ${error.message}`)
    return data || []
  }

  /**
   * Get terms for a specific session
   */
  static async getTermsForSession(schoolId: string, sessionId: string) {
    const { data, error } = await supabase
      .from('academic_terms')
      .select('id, session_id, term_name, term_number, is_active')
      .eq('school_id', schoolId)
      .eq('session_id', sessionId)
      .order('term_number', { ascending: true })

    if (error) throw new Error(`Failed to fetch terms for session: ${error.message}`)
    return data || []
  }

  /**
   * Get all class/arm combinations for a school with class and arm details
   */
  static async getClassArmCombos(schoolId: string) {
    const { data, error } = await supabase
      .from('class_arm_combos')
      .select(`
        id,
        school_id,
        class:class_id (id, name),
        arm:arm_id (id, name),
        class_teacher_id,
        created_at
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`Failed to fetch class/arm combos: ${error.message}`)
    return data || []
  }

  /**
   * Get students in a specific class with their profile data
   */
  static async getStudentsInClass(schoolId: string, classArmComboId: string) {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        admission_number,
        date_of_birth,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          gender,
          status
        )
      `)
      .eq('school_id', schoolId)
      .eq('class_arm_combo_id', classArmComboId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(`Failed to fetch students in class: ${error.message}`)
    
    // Filter for active students (status is in users table)
    return (data || []).filter(s => s.user?.status === 'ACTIVE' || !s.user?.status)
  }

  /**
   * Get scores for students in a specific term
   */
  static async getScoresForTerm(termId: string) {
    const { data, error } = await supabase
      .from('score_sheets')
      .select(`
        id,
        student_id,
        overall_score,
        performance_rating,
        term_id
      `)
      .eq('term_id', termId)

    if (error) throw new Error(`Failed to fetch scores for term: ${error.message}`)
    
    // Create a map for quick lookup
    const scoresMap = new Map()
    ;(data || []).forEach(score => {
      scoresMap.set(score.student_id, score)
    })
    
    return scoresMap
  }

  /**
   * Get complete class info with student counts and form master
   */
  static async getClassesWithDetails(schoolId: string) {
    const combos = await this.getClassArmCombos(schoolId)

    const classesWithDetails = await Promise.all(
      combos.map(async (combo) => {
        // Count students in class
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_arm_combo_id', combo.id)
          .eq('status', 'ACTIVE')

        // Get form master name
        let formMasterName = 'Unassigned'
        if (combo.class_teacher_id) {
          const { data: teacher } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', combo.class_teacher_id)
            .single()

          if (teacher) {
            formMasterName = teacher.full_name
          }
        }

        return {
          id: combo.id,
          class_name: combo.class?.name || 'Unknown',
          arm_name: combo.arm?.name || 'N/A',
          student_count: count || 0,
          form_master: formMasterName,
          class_id: combo.class?.id,
          arm_id: combo.arm?.id,
        }
      })
    )

    return classesWithDetails
  }

  /**
   * Get complete term structure with cascading data
   * Returns: Sessions → Terms → Classes → Students → Scores
   */
  static async getCompleteAcademicStructure(schoolId: string, selectedTermId?: string) {
    try {
      // Fetch all data in parallel
      const [sessions, terms, classes] = await Promise.all([
        this.getSessions(schoolId),
        this.getTerms(schoolId),
        this.getClassesWithDetails(schoolId),
      ])

      // Auto-select first active session if none selected
      let activeSession = sessions.find(s => s.is_active)
      if (!activeSession && sessions.length > 0) {
        activeSession = sessions[0]
      }

      // Auto-select first term of active session if none selected
      let activeTerm = null
      if (selectedTermId) {
        activeTerm = terms.find(t => t.id === selectedTermId)
      } else if (activeSession) {
        activeTerm = terms.find(t => t.session_id === activeSession?.id && t.is_active)
        if (!activeTerm) {
          const sessionTerms = terms.filter(t => t.session_id === activeSession?.id)
          activeTerm = sessionTerms.length > 0 ? sessionTerms[0] : null
        }
      }

      return {
        sessions,
        terms,
        classes,
        activeSession,
        activeTerm,
      }
    } catch (err) {
      console.error('Error fetching academic structure:', err)
      throw err
    }
  }

  /**
   * Get students in a specific class with their scores for a term
   */
  static async getStudentsWithScores(schoolId: string, classArmComboId: string, termId: string) {
    try {
      // Get students in class
      const students = await this.getStudentsInClass(schoolId, classArmComboId)

      // Get scores for term
      const scoresMap = await this.getScoresForTerm(termId)

      // Combine data
      const studentsWithScores = students.map(student => ({
        id: student.id,
        full_name: student.user?.full_name || 'Unknown',
        admission_number: student.admission_number,
        email: student.user?.email,
        phone: student.user?.phone,
        gender: student.user?.gender,
        overall_score: scoresMap.get(student.id)?.overall_score || 0,
        performance_rating: scoresMap.get(student.id)?.performance_rating || 'Not Graded',
      }))

      return studentsWithScores
    } catch (err) {
      console.error('Error fetching students with scores:', err)
      throw err
    }
  }

  /**
   * Validate that a session, term, and class belong to the same school
   */
  static async validateAcademicAssignment(
    schoolId: string,
    sessionId: string,
    termId: string,
    classArmComboId: string
  ): Promise<boolean> {
    try {
      // Check term belongs to session
      const { data: termData } = await supabase
        .from('academic_terms')
        .select('session_id')
        .eq('id', termId)
        .eq('session_id', sessionId)
        .eq('school_id', schoolId)
        .single()

      if (!termData) return false

      // Check class belongs to school
      const { data: classData } = await supabase
        .from('class_arm_combos')
        .select('school_id')
        .eq('id', classArmComboId)
        .eq('school_id', schoolId)
        .single()

      return !!classData
    } catch (err) {
      console.error('Error validating academic assignment:', err)
      return false
    }
  }
}
