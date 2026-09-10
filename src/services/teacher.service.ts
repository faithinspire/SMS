import { supabase } from '@/lib/supabase-client'

export interface Teacher {
  id: string
  userId: string
  schoolId: string
  firstName: string
  lastName: string
  email: string
  createdAt: string
}

export class TeacherService {
  static async registerTeacher(data: any): Promise<string> {
    try {
      const { data: teacher, error } = await supabase
        .from('teachers')
        .insert({
          school_id: data.school_id,
          user_id: data.user_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          photo_url: data.photo_url,
          bank_name: data.bank_name,
          account_number: data.account_number,
          account_name: data.account_name,
          salary: data.salary,
          teaching_level: data.teaching_level,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        console.error('❌ Teacher registration error:', error)
        throw error
      }

      console.log('✅ Teacher registered:', teacher.id)
      return teacher.id
    } catch (err: any) {
      console.error('❌ Exception registering teacher:', err)
      throw err
    }
  }

  static async assignSubjectsToTeacher(
    userId: string,
    subjectIds: string[],
    classArmComboId?: string,
    schoolId?: string
  ): Promise<void> {
    try {
      // Validate inputs
      if (!userId) {
        throw new Error('userId is required for subject assignment')
      }

      if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
        console.log('No subjects to assign')
        return
      }

      // Determine school_id and class_arm_combo_id
      let comboId = classArmComboId
      let school_id = schoolId

      // If no combo ID provided, we cannot proceed (it's required by the schema)
      if (!comboId) {
        throw new Error('class_arm_combo_id is required for subject assignment')
      }

      // If still no school_id, get from users table using userId (which references users.id)
      if (!school_id) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', userId)
          .single()

        if (userError || !user) {
          throw new Error(`Cannot find user with ID ${userId} to determine school_id`)
        }

        school_id = user.school_id
      }

      if (!school_id) {
        throw new Error('Cannot determine school_id for subject assignment')
      }

      // Create assignments for each subject
      // NOTE: teacher_id column in subject_teacher_assignments references users(id), not teachers(id)
      const assignments = subjectIds.map((subjectId) => ({
        teacher_id: userId, // This is users.id, not teachers.id
        subject_id: subjectId,
        class_arm_combo_id: comboId,
        school_id: school_id,
        created_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('subject_teacher_assignments')
        .insert(assignments)

      if (error) {
        console.error('❌ Subject assignment error:', error)
        throw error
      }

      console.log(`✅ Assigned ${subjectIds.length} subjects to teacher`)
    } catch (err: any) {
      console.error('❌ Exception assigning subjects:', err)
      throw err
    }
  }

  static async assignClassToTeacher(
    userId: string,
    classArmComboId: string
  ): Promise<void> {
    try {
      if (!userId) {
        throw new Error('userId is required for class assignment')
      }

      if (!classArmComboId) {
        throw new Error('classArmComboId is required for class assignment')
      }

      // NOTE: class_arm_combos.class_teacher_id references users(id), not teachers(id)
      const { error } = await supabase
        .from('class_arm_combos')
        .update({ class_teacher_id: userId })
        .eq('id', classArmComboId)

      if (error) {
        console.error('❌ Class assignment error:', error)
        throw error
      }

      console.log('✅ Class assigned to teacher')
    } catch (err: any) {
      console.error('❌ Exception assigning class:', err)
      throw err
    }
  }

  static async assignSubjects(
    teacherId: string,
    schoolId: string,
    assignments: Array<{ subjectId: string; classArmComboId: string }>
  ): Promise<void> {
    const records = assignments.map((a) => ({
      teacher_id: teacherId,
      subject_id: a.subjectId,
      class_arm_combo_id: a.classArmComboId,
      school_id: schoolId,
    }))

    const { error } = await supabase.from('subject_teacher_assignments').insert(records)
    if (error) throw error
  }

  static async getTeacherDashboard(teacherId: string, schoolId: string): Promise<any> {
    try {
      // Get class assignment for this teacher (from class_arm_combos.class_teacher_id)
      const { data: managedClasses, error: classError } = await supabase
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
        .eq('class_teacher_id', teacherId)
        .eq('school_id', schoolId)

      if (classError) throw classError

      // Get subjects taught by this teacher with complete data
      const { data: taughtSubjects, error: subjectError } = await supabase
        .from('subject_teacher_assignments')
        .select(
          `
          id,
          subject_id,
          class_arm_combo_id,
          subjects (id, name, code),
          class_arm_combos (
            id,
            classes (id, name, level, type),
            arms (id, name)
          )
        `
        )
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)

      if (subjectError) throw subjectError

      // Get students in managed classes (students who have this class_arm_combo_id)
      let classStudents: any[] = []
      if (managedClasses && managedClasses.length > 0) {
        const classComboIds = managedClasses.map(c => c.id)
        
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select(
            `
            id,
            user_id,
            admission_number,
            class_arm_combo_id,
            users!students_user_id_fkey (
              id,
              full_name,
              email,
              photo_url
            ),
            student_subjects (
              id,
              subject_id,
              subjects (id, name, code)
            )
          `
          )
          .in('class_arm_combo_id', classComboIds)
          .eq('school_id', schoolId)

        if (!studentError && students) {
          classStudents = students
        }
      }

      // Get students taking subjects taught by this teacher
      let subjectStudents: any[] = []
      if (taughtSubjects && taughtSubjects.length > 0) {
        const subjectIds = taughtSubjects.map(s => s.subject_id)
        
        const { data: students, error: studentError } = await supabase
          .from('student_subjects')
          .select(
            `
            id,
            student_id,
            subject_id,
            students (
              id,
              user_id,
              admission_number,
              class_arm_combo_id,
              users!students_user_id_fkey (
                id,
                full_name,
                email,
                photo_url
              ),
              class_arm_combos (
                id,
                classes (id, name, level, type),
                arms (id, name)
              )
            ),
            subjects (id, name, code)
          `
          )
          .in('subject_id', subjectIds)
          .eq('school_id', schoolId)

        if (!studentError && students) {
          subjectStudents = students
        }
      }

      // Calculate stats
      const classesManaged = managedClasses?.length || 0
      const subjectsTaught = new Set((taughtSubjects || []).map((s: any) => s.subject_id)).size
      const classStudentCount = classStudents.length
      const subjectStudentCount = subjectStudents.length
      // Avoid double counting - some students might be both class and subject students
      const totalStudents = new Set([
        ...classStudents.map(s => s.id),
        ...subjectStudents.map(s => s.students?.id).filter(Boolean)
      ]).size

      return {
        managedClasses: managedClasses || [],
        taughtSubjects: taughtSubjects || [],
        classStudents: classStudents || [],
        subjectStudents: subjectStudents || [],
        stats: {
          classStudentCount,
          subjectStudentCount,
          totalStudents,
          classesManaged,
          subjectsTaught,
        },
      }
    } catch (error) {
      console.error('Error loading teacher dashboard:', error)
      throw error
    }
  }

  static async getClassStudents(classArmComboId: string, schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(
          `
          id,
          user_id,
          admission_number,
          class_arm_combo_id,
          users!students_user_id_fkey (
            id,
            full_name,
            email,
            photo_url
          ),
          student_subjects (
            id,
            subject_id,
            subjects (id, name, code)
          )
        `
        )
        .eq('class_arm_combo_id', classArmComboId)
        .eq('school_id', schoolId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error loading class students:', error)
      throw error
    }
  }

  static async getSubjectStudents(
    subjectId: string,
    teacherId: string,
    schoolId: string
  ): Promise<any[]> {
    try {
      // STEP 1: Verify teacher is assigned to teach this subject
      const { data: assignments, error: assignmentError } = await supabase
        .from('subject_teacher_assignments')
        .select('class_arm_combo_id')
        .eq('subject_id', subjectId)
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)

      if (assignmentError || !assignments || assignments.length === 0) {
        console.warn('Teacher not assigned to this subject')
        return []
      }

      const classIds = assignments.map((a: any) => a.class_arm_combo_id)

      // STEP 2: Get all students in teacher's assigned classes (not from student_subjects)
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(
          `
          id,
          user_id,
          admission_number,
          class_arm_combo_id,
          users (
            id,
            full_name,
            email,
            photo_url
          ),
          class_arm_combos (
            id,
            classes (id, name, level, type),
            arms (id, name)
          )
        `
        )
        .eq('school_id', schoolId)
        .in('class_arm_combo_id', classIds)

      if (studentError) throw studentError
      
      if (!students || students.length === 0) {
        console.log('No students in teacher assigned classes')
        return []
      }

      // Format response
      return students.map((student: any) => ({
        id: student.id,
        user_id: student.user_id,
        admission_number: student.admission_number,
        full_name: student.users?.full_name || 'N/A',
        email: student.users?.email,
        photo_url: student.users?.photo_url,
        class_name: student.class_arm_combos?.classes?.name || 'Unknown',
        arm_name: student.class_arm_combos?.arms?.name || 'Unknown',
        class_display: `${student.class_arm_combos?.classes?.name || 'Unknown'} - ${student.class_arm_combos?.arms?.name || 'Unknown'}`,
      }))
    } catch (error) {
      console.error('Error loading subject students:', error)
      throw error
    }
  }

  // ========================================================================
  // NEW UNIFIED ARCHITECTURE METHODS (CANONICAL DATA FLOW)
  // ========================================================================

  /**
   * Get all subjects taught by a teacher with their class assignments
   * CANONICAL: Uses subject_teacher_assignments table
   */
  static async getTeacherSubjects(teacherId: string, schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('subject_teacher_assignments')
        .select(
          `
          id,
          subject_id,
          class_arm_combo_id,
          subjects (id, name, code),
          class_arm_combos (
            id,
            classes (id, name, level, type),
            arms (id, name)
          )
        `
        )
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('[TeacherService] Error fetching teacher subjects:', error)
        throw error
      }

      // Group by subject
      const subjectMap = new Map<string, any>()
      data?.forEach((assignment: any) => {
        const subject = assignment.subjects
        const subjectId = subject.id

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            id: subjectId,
            name: subject.name,
            code: subject.code,
            classes: [],
          })
        }

        const classInfo = assignment.class_arm_combos
        subjectMap.get(subjectId).classes.push({
          id: classInfo.id,
          name: `${classInfo.classes?.name || 'Unknown'} - ${classInfo.arms?.name || 'Unknown'}`,
        })
      })

      return Array.from(subjectMap.values())
    } catch (error) {
      console.error('[TeacherService] Exception in getTeacherSubjects:', error)
      throw error
    }
  }

  /**
   * Get students for a subject teacher's score sheet
   * CANONICAL: student_subjects filtered by teacher's assigned classes
   * 
   * Returns ONLY students who:
   * 1. Are enrolled in the specified subject
   * 2. Are in a class where teacher teaches that subject
   * 3. Include their current scores if any exist
   */
  static async getSubjectTeacherStudents(
    teacherId: string,
    subjectId: string,
    schoolId: string,
    classArmComboId?: string
  ): Promise<any[]> {
    try {
      // STEP 1: Get teacher's class assignments for this subject
      const { data: assignments, error: assignmentError } = await supabase
        .from('subject_teacher_assignments')
        .select('class_arm_combo_id')
        .eq('teacher_id', teacherId)
        .eq('subject_id', subjectId)
        .eq('school_id', schoolId)

      if (assignmentError) {
        console.error('[TeacherService] Error fetching assignments:', assignmentError)
        throw assignmentError
      }

      if (!assignments || assignments.length === 0) {
        console.log('[TeacherService] Teacher not assigned to this subject')
        return []
      }

      let classIds = assignments.map((a: any) => a.class_arm_combo_id)

      // Filter to specific class if provided
      if (classArmComboId && classIds.includes(classArmComboId)) {
        classIds = [classArmComboId]
      } else if (classArmComboId) {
        console.log('[TeacherService] Requested class not in teacher assignments')
        return []
      }

      // STEP 2: Get all students enrolled in this subject
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_subjects')
        .select(
          `
          id,
          student_id,
          students (
            id,
            admission_number,
            class_arm_combo_id,
            users (id, full_name, email, photo_url),
            class_arm_combos (
              id,
              classes (id, name, level, type),
              arms (id, name)
            )
          )
        `
        )
        .eq('subject_id', subjectId)
        .eq('school_id', schoolId)

      if (enrollmentError) {
        console.error('[TeacherService] Error fetching enrollments:', enrollmentError)
        throw enrollmentError
      }

      if (!enrollments || enrollments.length === 0) {
        console.log('[TeacherService] No students enrolled in subject')
        return []
      }

      // STEP 3: Filter to only students in teacher's classes
      const filteredStudents = enrollments
        .filter((enrollment: any) => {
          const student = enrollment.students
          return student && classIds.includes(student.class_arm_combo_id)
        })
        .map((enrollment: any) => {
          const student = enrollment.students
          const classInfo = student?.class_arm_combos
          const user = student?.users

          return {
            id: student.id,
            admission_number: student.admission_number,
            full_name: user?.full_name || 'N/A',
            email: user?.email,
            photo_url: user?.photo_url,
            class_name: classInfo?.classes?.name || 'Unknown',
            arm_name: classInfo?.arms?.name || 'Unknown',
            class_display: `${classInfo?.classes?.name || 'Unknown'} - ${classInfo?.arms?.name || 'Unknown'}`,
          }
        })
        .sort((a: any, b: any) => a.admission_number.localeCompare(b.admission_number))

      // STEP 4: Enrich with current scores (optional)
      const studentIds = filteredStudents.map((s: any) => s.id)
      const { data: scores } = await supabase
        .from('score_sheets')
        .select('student_id, test1, test2, test3, test4, exam, total, grade')
        .eq('subject_id', subjectId)
        .eq('school_id', schoolId)
        .in('student_id', studentIds)

      const scoreMap = new Map()
      scores?.forEach((score: any) => {
        scoreMap.set(score.student_id, {
          test1: score.test1,
          test2: score.test2,
          test3: score.test3,
          test4: score.test4,
          exam: score.exam,
          total: score.total,
          grade: score.grade,
        })
      })

      return filteredStudents.map((student: any) => ({
        ...student,
        current_scores: scoreMap.get(student.id) || null,
      }))
    } catch (error) {
      console.error('[TeacherService] Exception in getSubjectTeacherStudents:', error)
      throw error
    }
  }

  static async updateTeacherProfile(
    teacherId: string,
    schoolId: string,
    updates: {
      fullName?: string
      email?: string
      phone?: string
      employmentDate?: string
      bankName?: string
      accountNumber?: string
      accountHolderName?: string
      salaryAmount?: number | string
      classArmComboId?: string | null
      subjectIds?: string[]
    }
  ): Promise<{ teacher: any }> {
    try {
      console.log('🔄 Updating teacher profile for:', teacherId)

      // Get existing teacher to verify it exists
      const { data: existingTeacher, error: fetchError } = await supabase
        .from('users')
        .select('id, school_id')
        .eq('id', teacherId)
        .eq('school_id', schoolId)
        .single()

      if (fetchError || !existingTeacher) {
        throw new Error(`Teacher not found: ${teacherId}`)
      }

      console.log('✅ Found existing teacher record')

      // Prepare user table update
      const userUpdates: any = {
        updated_at: new Date().toISOString(),
      }

      if (updates.fullName) {
        userUpdates.full_name = updates.fullName
      }

      if (updates.email) {
        userUpdates.email = updates.email
      }

      if (updates.phone) {
        userUpdates.phone = updates.phone
      }

      if (updates.employmentDate) {
        userUpdates.employment_date = updates.employmentDate
      }

      if (updates.bankName) {
        userUpdates.bank_name = updates.bankName
      }

      if (updates.accountNumber) {
        userUpdates.account_number = updates.accountNumber
      }

      if (updates.accountHolderName) {
        userUpdates.account_holder_name = updates.accountHolderName
      }

      if (updates.salaryAmount !== undefined) {
        userUpdates.salary_amount = updates.salaryAmount ? parseFloat(updates.salaryAmount as string) : null
      }

      // Update user record
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', teacherId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update teacher: ${updateError.message}`)
      }

      console.log('✅ Teacher record updated')

      // Update class teacher assignment if provided
      if (updates.classArmComboId !== undefined) {
        // First remove from any existing class
        await supabase
          .from('class_arm_combos')
          .update({ class_teacher_id: null })
          .eq('class_teacher_id', teacherId)

        // Then assign to new class if provided
        if (updates.classArmComboId) {
          const { error: classError } = await supabase
            .from('class_arm_combos')
            .update({ class_teacher_id: teacherId })
            .eq('id', updates.classArmComboId)

          if (classError) {
            console.warn('⚠️ Could not update class assignment:', classError)
          } else {
            console.log('✅ Class assignment updated')
          }
        } else {
          console.log('✅ Class assignment removed')
        }
      }

      // Update subject enrollment if provided
      if (updates.subjectIds && Array.isArray(updates.subjectIds)) {
        // Delete old subject enrollments
        const { error: deleteError } = await supabase
          .from('subject_teacher_assignments')
          .delete()
          .eq('teacher_id', teacherId)

        if (deleteError) {
          console.warn('⚠️ Could not delete old subjects:', deleteError)
        } else {
          console.log('✅ Old subject assignments removed')
        }

        // Add new subject enrollments
        if (updates.subjectIds.length > 0 && updates.classArmComboId) {
          const newSubjects = updates.subjectIds.map(subjectId => ({
            teacher_id: teacherId,
            subject_id: subjectId,
            class_arm_combo_id: updates.classArmComboId,
            school_id: schoolId,
            created_at: new Date().toISOString(),
          }))

          const { error: insertError } = await supabase
            .from('subject_teacher_assignments')
            .insert(newSubjects)

          if (insertError) {
            console.warn('⚠️ Could not link new subjects:', insertError)
          } else {
            console.log('✅ New subjects linked')
          }
        }
      }

      return {
        teacher: updatedUser,
      }
    } catch (error: any) {
      console.error('❌ Teacher profile update failed:', error)
      throw error
    }
  }
}
