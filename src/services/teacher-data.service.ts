'use client'

/**
 * ============================================================================
 * MASTER TEACHER DATA SERVICE - HARD FIX REBUILD
 * ============================================================================
 * 
 * This service is the SINGLE SOURCE OF TRUTH for all teacher data queries.
 * All UI components MUST use this service. NO direct Supabase queries in components.
 * 
 * Design Principles:
 * 1. Explicit relationships - No ambiguous joins
 * 2. Proper error handling - Log actual errors, don't hide them
 * 3. Safe data access - Always validate school_id and teacher_id before querying
 * 4. Type safety - Full TypeScript interfaces
 * 5. Debugging - Console logs for development
 * ============================================================================
 */

import { supabase } from '@/lib/supabase-client'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TeacherProfile {
  userId: string
  schoolId: string
  schoolName: string
  email: string
  fullName: string
  role: string
}

export interface ClassInfo {
  id: string
  name: string
  classLevel: string
  armName: string
  displayName: string // "SS1A", "JSS2B", etc.
}

export interface SubjectInfo {
  id: string
  name: string
  code: string
}

export interface StudentData {
  id: string
  userId: string
  name: string
  admissionNumber: string
  classId: string
  classDisplayName: string
}

export interface ClassStudentData extends StudentData {
  subjects: SubjectInfo[]
}

export interface SubjectStudentData extends StudentData {
  classDisplayName: string
}

export interface TermInfo {
  id: string
  name: string
  sessionYear: number
  startDate: string
  endDate: string
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class TeacherDataService {
  /**
   * PHASE 3: Get complete teacher profile and assignments
   * This is called ONCE on dashboard load
   */
  static async getTeacherProfile(userId: string): Promise<TeacherProfile> {
    if (!userId) throw new Error('userId is required')

    console.log('[TeacherDataService] Loading profile for user:', userId)

    try {
      // Step 1: Get user + school
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, school_id, email, full_name, role')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        throw new Error(`User not found: ${userError?.message}`)
      }

      if (userData.role !== 'TEACHER') {
        throw new Error(`User is not a teacher (role: ${userData.role})`)
      }

      // Step 2: Get school
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', userData.school_id)
        .single()

      if (schoolError || !schoolData) {
        throw new Error(`School not found: ${schoolError?.message}`)
      }

      const profile: TeacherProfile = {
        userId: userData.id,
        schoolId: userData.school_id,
        schoolName: schoolData.name,
        email: userData.email || 'unknown@school.local',
        fullName: userData.full_name,
        role: userData.role,
      }

      console.log('[TeacherDataService] Profile loaded:', profile.fullName)
      return profile
    } catch (error) {
      console.error('[TeacherDataService] Error loading profile:', error)
      throw error
    }
  }

  /**
   * PHASE 4: Get teacher's assigned classes
   * Used for class dropdown filter
   */
  static async getTeacherClasses(
    schoolId: string,
    teacherId: string
  ): Promise<ClassInfo[]> {
    if (!schoolId) throw new Error('schoolId is required')
    if (!teacherId) throw new Error('teacherId is required')

    console.log(
      `[TeacherDataService] Loading classes for teacher ${teacherId} in school ${schoolId}`
    )

    try {
      // Query: Find all class_arm_combos where this teacher is class_teacher
      const { data: classData, error: classError } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes (
            id,
            name,
            level,
            type
          ),
          arms (
            id,
            name
          )
        `)
        .eq('class_teacher_id', teacherId)
        .eq('school_id', schoolId)
        .order('id')

      if (classError) {
        throw new Error(`Query failed: ${classError.message}`)
      }

      if (!classData || classData.length === 0) {
        console.warn(
          `[TeacherDataService] Teacher ${teacherId} has NO class assignments`
        )
        return []
      }

      const classes: ClassInfo[] = (classData as any[]).map((combo: any) => ({
        id: combo.id,
        name: combo.classes?.name || 'Unknown',
        classLevel: combo.classes?.level?.toString() || '0',
        armName: combo.arms?.name || 'Unknown',
        displayName: `${combo.classes?.name || ''} ${combo.arms?.name || ''}`.trim(),
      }))

      console.log(
        `[TeacherDataService] Loaded ${classes.length} classes:`,
        classes.map((c) => c.displayName)
      )
      return classes
    } catch (error) {
      console.error('[TeacherDataService] Error loading classes:', error)
      throw error
    }
  }

  /**
   * PHASE 4: Get teacher's assigned subjects
   * Used for subject dropdown filter
   */
  static async getTeacherSubjects(
    schoolId: string,
    teacherId: string
  ): Promise<SubjectInfo[]> {
    if (!schoolId) throw new Error('schoolId is required')
    if (!teacherId) throw new Error('teacherId is required')

    console.log(
      `[TeacherDataService] Loading subjects for teacher ${teacherId}`
    )

    try {
      // Query: Find all DISTINCT subjects assigned to this teacher
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          subject_id,
          subjects (
            id,
            name,
            code
          )
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)

      if (assignmentError) {
        throw new Error(`Query failed: ${assignmentError.message}`)
      }

      if (!assignmentData || assignmentData.length === 0) {
        console.warn(
          `[TeacherDataService] Teacher ${teacherId} has NO subject assignments`
        )
        return []
      }

      // Remove duplicates (teacher might teach same subject in multiple classes)
      const uniqueSubjects = new Map<string, SubjectInfo>()

      ;(assignmentData as any[]).forEach((assignment: any) => {
        const subject = assignment.subjects
        if (subject && subject.id) {
          uniqueSubjects.set(subject.id, {
            id: subject.id,
            name: subject.name,
            code: subject.code || '',
          })
        }
      })

      const subjects = Array.from(uniqueSubjects.values())

      console.log(
        `[TeacherDataService] Loaded ${subjects.length} subjects:`,
        subjects.map((s) => s.name)
      )
      return subjects
    } catch (error) {
      console.error('[TeacherDataService] Error loading subjects:', error)
      throw error
    }
  }

  /**
   * PHASE 5: Get students in a specific class
   * Used for CLASS STUDENTS tab
   */
  static async getClassStudents(
    schoolId: string,
    classArmComboId: string
  ): Promise<ClassStudentData[]> {
    if (!schoolId) throw new Error('schoolId is required')
    if (!classArmComboId) throw new Error('classArmComboId is required')

    console.log(
      `[TeacherDataService] Loading students for class ${classArmComboId}`
    )

    try {
      // Query students using TWO SEPARATE queries to avoid ambiguous joins
      // Step 1: Get student IDs and basic info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, user_id, admission_number, class_arm_combo_id')
        .eq('class_arm_combo_id', classArmComboId)
        .eq('school_id', schoolId)

      if (studentError) {
        throw new Error(`Students query failed: ${studentError.message}`)
      }

      if (!studentData || studentData.length === 0) {
        console.warn(
          `[TeacherDataService] No students in class ${classArmComboId}`
        )
        return []
      }

      // Step 2: Get user names for these students
      const userIds = (studentData as any[]).map((s) => s.user_id)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds)

      if (userError) {
        throw new Error(`Users query failed: ${userError.message}`)
      }

      // Step 3: Create user lookup map
      const userMap = new Map<string, string>()
      ;(userData as any[]).forEach((u) => {
        userMap.set(u.id, u.full_name)
      })

      // Step 4: Get class display name
      const { data: classComboData, error: classComboError } = await supabase
        .from('class_arm_combos')
        .select(`
          classes (name, level),
          arms (name)
        `)
        .eq('id', classArmComboId)
        .single()

      if (classComboError) {
        throw new Error(`Class combo query failed: ${classComboError.message}`)
      }

      const classDisplayName = classComboData
        ? `${classComboData.classes?.name} ${classComboData.arms?.name}`.trim()
        : 'Unknown'

      // Step 5: Get student subjects for each student
      const { data: subjectData, error: subjectError } = await supabase
        .from('student_subjects')
        .select(`
          student_id,
          subjects (
            id,
            name,
            code
          )
        `)
        .in(
          'student_id',
          (studentData as any[]).map((s) => s.id)
        )

      if (subjectError) {
        throw new Error(`Student subjects query failed: ${subjectError.message}`)
      }

      // Step 6: Create subject lookup map
      const subjectMap = new Map<string, SubjectInfo[]>()
      ;(subjectData as any[]).forEach((ss) => {
        if (!subjectMap.has(ss.student_id)) {
          subjectMap.set(ss.student_id, [])
        }
        if (ss.subjects) {
          subjectMap.get(ss.student_id)!.push({
            id: ss.subjects.id,
            name: ss.subjects.name,
            code: ss.subjects.code || '',
          })
        }
      })

      // Step 7: Combine all data
      const students: ClassStudentData[] = (studentData as any[])
        .map((student) => ({
          id: student.id,
          userId: student.user_id,
          name: userMap.get(student.user_id) || 'Unknown',
          admissionNumber: student.admission_number,
          classId: student.class_arm_combo_id,
          classDisplayName,
          subjects: subjectMap.get(student.id) || [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      console.log(
        `[TeacherDataService] Loaded ${students.length} class students`
      )
      return students
    } catch (error) {
      console.error('[TeacherDataService] Error loading class students:', error)
      throw error
    }
  }

  /**
   * PHASE 5: Get students offering a specific subject
   * Used for SUBJECT STUDENTS tab
   */
  static async getSubjectStudents(
    schoolId: string,
    subjectId: string
  ): Promise<SubjectStudentData[]> {
    if (!schoolId) throw new Error('schoolId is required')
    if (!subjectId) throw new Error('subjectId is required')

    console.log(`[TeacherDataService] Loading students for subject ${subjectId}`)

    try {
      // Step 1: Get all student_subjects records for this subject
      const { data: studentSubjectData, error: ssError } = await supabase
        .from('student_subjects')
        .select('student_id')
        .eq('subject_id', subjectId)
        .eq('school_id', schoolId)

      if (ssError) {
        console.error(`[TeacherDataService] student_subjects query error:`, ssError)
        throw new Error(`Student subjects query failed: ${ssError.message}`)
      }

      console.log(`[TeacherDataService] Found ${studentSubjectData?.length || 0} student-subject links for subject ${subjectId}`)

      if (!studentSubjectData || studentSubjectData.length === 0) {
        console.warn(`[TeacherDataService] No student-subject links for subject ${subjectId} - students may not have enrolled in this subject`)
        return []
      }

      const studentIds = (studentSubjectData as any[]).map((ss) => ss.student_id)
      console.log(`[TeacherDataService] Student IDs for this subject:`, studentIds)

      // Step 2: Get student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, user_id, admission_number, class_arm_combo_id')
        .in('id', studentIds)
        .eq('school_id', schoolId)

      if (studentError) {
        throw new Error(`Students query failed: ${studentError.message}`)
      }

      console.log(`[TeacherDataService] Retrieved ${studentData?.length || 0} student records`)

      if (!studentData) {
        return []
      }

      // Step 3: Get user names
      const userIds = (studentData as any[]).map((s) => s.user_id)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds)

      if (userError) {
        throw new Error(`Users query failed: ${userError.message}`)
      }

      console.log(`[TeacherDataService] Retrieved ${userData?.length || 0} user records`)

      const userMap = new Map<string, string>()
      ;(userData as any[]).forEach((u) => {
        userMap.set(u.id, u.full_name)
      })

      // Step 4: Get class info for each student
      const classComboIds = (studentData as any[]).map(
        (s) => s.class_arm_combo_id
      )
      const { data: classComboData, error: classComboError } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes (name, level),
          arms (name)
        `)
        .in('id', classComboIds)

      if (classComboError) {
        throw new Error(`Class combos query failed: ${classComboError.message}`)
      }

      console.log(`[TeacherDataService] Retrieved ${classComboData?.length || 0} class combo records`)

      const classMap = new Map<string, string>()
      ;(classComboData as any[]).forEach((cc) => {
        const displayName = `${cc.classes?.name} ${cc.arms?.name}`.trim()
        classMap.set(cc.id, displayName)
      })

      // Step 5: Combine all data
      const students: SubjectStudentData[] = (studentData as any[])
        .map((student) => ({
          id: student.id,
          userId: student.user_id,
          name: userMap.get(student.user_id) || 'Unknown',
          admissionNumber: student.admission_number,
          classId: student.class_arm_combo_id,
          classDisplayName: classMap.get(student.class_arm_combo_id) || 'Unknown',
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      console.log(
        `[TeacherDataService] Loaded ${students.length} subject students`
      )
      return students
    } catch (error) {
      console.error('[TeacherDataService] Error loading subject students:', error)
      throw error
    }
  }

  /**
   * PHASE 6: Get terms for dropdown
   * NOTE: Removed is_active filter to show ALL terms (1st, 2nd, 3rd)
   */
  static async getTerms(schoolId: string): Promise<TermInfo[]> {
    if (!schoolId) throw new Error('schoolId is required')

    console.log(`[TeacherDataService] Loading academic terms for school ${schoolId}`)

    try {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('id, term_name, start_date, end_date, academic_sessions(session_year)')
        .eq('school_id', schoolId)
        // REMOVED: .eq('is_active', true) - Now fetches ALL terms
        .order('academic_sessions(session_year)', { ascending: false })
        .order('term_name', { ascending: true })

      if (error) {
        throw new Error(`Query failed: ${error.message}`)
      }

      const terms: TermInfo[] = (data as any[]).map((t) => ({
        id: t.id,
        name: t.term_name,
        sessionYear: t.academic_sessions?.session_year || '',
        startDate: t.start_date,
        endDate: t.end_date,
      }))

      console.log(`[TeacherDataService] Loaded ${terms.length} academic terms (all, including inactive)`)
      return terms
    } catch (error) {
      console.error('[TeacherDataService] Error loading academic terms:', error)
      throw error
    }
  }

  /**
   * PHASE 7: Get attendance students (for attendance page)
   * Uses safe query pattern to avoid PGRST201 error
   */
  static async getAttendanceStudents(
    schoolId: string,
    classArmComboId: string
  ): Promise<ClassStudentData[]> {
    // Same as getClassStudents - reuse it
    return this.getClassStudents(schoolId, classArmComboId)
  }

  /**
   * PHASE 7: Save attendance record
   */
  static async saveAttendance(
    schoolId: string,
    classArmComboId: string,
    studentId: string,
    date: string,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
    recordedBy: string
  ): Promise<void> {
    if (!schoolId || !classArmComboId || !studentId || !date || !recordedBy) {
      throw new Error('Missing required fields for attendance save')
    }

    try {
      // Use upsert to handle both create and update
      const { error } = await supabase.from('attendance').upsert(
        {
          school_id: schoolId,
          class_arm_combo_id: classArmComboId,
          student_id: studentId,
          date,
          status,
          recorded_by: recordedBy,
          recorded_at: new Date().toISOString(),
        },
        {
          onConflict: 'school_id, student_id, date',
        }
      )

      if (error) {
        throw new Error(`Save failed: ${error.message}`)
      }

      console.log(
        `[TeacherDataService] Attendance saved for student ${studentId}: ${status}`
      )
    } catch (error) {
      console.error('[TeacherDataService] Error saving attendance:', error)
      throw error
    }
  }

  /**
   * PHASE 6: Get score sheet students
   */
  static async getScoreSheetStudents(
    schoolId: string,
    classArmComboId: string,
    subjectId?: string
  ): Promise<ClassStudentData[]> {
    if (subjectId) {
      // Get subject students
      return this.getSubjectStudents(schoolId, subjectId)
    } else {
      // Get class students
      return this.getClassStudents(schoolId, classArmComboId)
    }
  }
}

export default TeacherDataService
