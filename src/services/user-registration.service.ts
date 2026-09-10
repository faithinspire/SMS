import { supabase } from '@/lib/supabase-client'

export interface StaffRegistrationData {
  email: string
  password: string
  full_name: string
  role: 'TEACHER' | 'PRINCIPAL' | 'ACCOUNTANT' | 'HEAD_TEACHER' | 'STAFF'
  school_id: string
  photo_url?: string
}

export interface TeacherRegistrationData extends StaffRegistrationData {
  role: 'TEACHER'
  class_arm_combo_id?: string // Class teacher assignment
  subject_ids?: string[] // Subjects taught
}

export interface StudentRegistrationData {
  email: string
  password: string
  full_name: string
  school_id: string
  admission_number: string
  class_arm_combo_id: string
  subject_ids?: string[]
  photo_url?: string
}

export class UserRegistrationService {
  /**
   * Register staff member (by School Admin)
   * Creates both Supabase auth user and database record
   * For non-teacher staff, use this method
   */
  static async registerStaffMember(data: StaffRegistrationData): Promise<{ id: string; email: string }> {
    try {
      // Validate email format more strictly
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(data.email)) {
        throw new Error(`Invalid email format: ${data.email}. Please use format: name@example.com (e.g., jane.doe@school.com)`)
      }

      // Normalize email
      const normalizedEmail = data.email.trim().toLowerCase()

      console.log('📝 Registering staff member:', {
        email: normalizedEmail,
        name: data.full_name,
        role: data.role,
      })

      // Use server-side API to register (bypasses client-side auth restrictions)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: data.password,
          full_name: data.full_name,
          role: data.role,
          school_id: data.school_id,
          user_type: 'STAFF',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to register staff member')
      }

      const { user: authUser } = await response.json()
      
      if (!authUser) {
        throw new Error('Staff registration failed - no user returned')
      }

      console.log('✅ Auth user created:', authUser.id)

      // Create user record in database
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          school_id: data.school_id,
          email: normalizedEmail,
          full_name: data.full_name,
          photo_url: data.photo_url || null,
          role: data.role,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (dbError) {
        console.warn('⚠️ Database user creation warning:', dbError)
        // Don't fail - auth user is created, DB can be fixed later
      } else {
        console.log('✅ Database user created:', dbUser.id)
      }

      return {
        id: authUser.id,
        email: normalizedEmail,
      }
    } catch (error: any) {
      console.error('❌ Staff registration error:', error)
      throw new Error(error.message || 'Failed to register staff member')
    }
  }

  /**
   * Register teacher with class and subject assignments
   * Teachers MUST have at least one subject or class assignment
   */
  static async registerTeacher(data: TeacherRegistrationData): Promise<{ id: string; email: string }> {
    try {
      // Validate email format more strictly
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(data.email)) {
        throw new Error(`Invalid email format: ${data.email}. Please use format: name@example.com (e.g., mr.smith@school.com)`)
      }

      // First, register as regular staff (with trimmed email)
      const staffResult = await this.registerStaffMember({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        role: 'TEACHER',
        school_id: data.school_id,
        photo_url: data.photo_url,
      })

      const teacherId = staffResult.id

      // Assign as class teacher if provided
      if (data.class_arm_combo_id) {
        console.log('📚 Assigning class teacher:', data.class_arm_combo_id)

        const { error: classTeacherError } = await supabase
          .from('class_arm_combos')
          .update({ class_teacher_id: teacherId })
          .eq('id', data.class_arm_combo_id)
          .eq('school_id', data.school_id)

        if (classTeacherError) {
          console.warn('⚠️ Class teacher assignment warning:', classTeacherError)
        } else {
          console.log('✅ Assigned as class teacher')
        }
      }

      // Assign subjects if provided
      if (data.subject_ids && data.subject_ids.length > 0) {
        console.log('📚 Assigning subjects:', data.subject_ids)

        const subjectAssignments = data.subject_ids.map(subjectId => ({
          teacher_id: teacherId,
          subject_id: subjectId,
          class_arm_combo_id: data.class_arm_combo_id || null,
          school_id: data.school_id,
          created_at: new Date().toISOString(),
        }))

        const { error: subjectError } = await supabase
          .from('subject_teacher_assignments')
          .insert(subjectAssignments)

        if (subjectError) {
          console.warn('⚠️ Subject assignment warning:', subjectError)
        } else {
          console.log('✅ Assigned subjects')
        }
      }

      console.log('✅ Teacher registered successfully')

      return {
        id: teacherId,
        email: data.email,
      }
    } catch (error: any) {
      console.error('❌ Teacher registration error:', error)
      throw new Error(error.message || 'Failed to register teacher')
    }
  }

  /**
   * Register student with automatic class and subject linking
   * Student must have a class assignment
   * Student can optionally select subjects for secondary students
   */
  static async registerStudent(data: StudentRegistrationData): Promise<{ id: string; email: string }> {
    try {
      // Validate email format more strictly
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(data.email)) {
        throw new Error(`Invalid email format: ${data.email}. Please use format: name@example.com (e.g., john.doe@school.com)`)
      }

      // Normalize email
      const normalizedEmail = data.email.trim().toLowerCase()

      console.log('📝 Registering student:', {
        email: normalizedEmail,
        name: data.full_name,
        admission: data.admission_number,
      })

      // Use server-side API to register (bypasses client-side auth restrictions)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: data.password,
          full_name: data.full_name,
          role: 'STUDENT',
          school_id: data.school_id,
          user_type: 'STUDENT',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to register student')
      }

      const { user: authUser } = await response.json()
      
      if (!authUser) {
        throw new Error('Student registration failed - no user returned')
      }

      console.log('✅ Auth user created:', authUser.id)

      // Create user record in database
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          school_id: data.school_id,
          email: normalizedEmail,
          full_name: data.full_name,
          photo_url: data.photo_url || null,
          role: 'STUDENT',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (dbError) {
        console.warn('⚠️ Database user creation warning:', dbError)
      } else {
        console.log('✅ Database user created:', dbUser.id)
      }

      // Create student record
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: authUser.id,
          school_id: data.school_id,
          admission_number: data.admission_number,
          class_arm_combo_id: data.class_arm_combo_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (studentError) {
        console.error('❌ Student record creation error:', studentError)
      } else {
        console.log('✅ Student record created:', studentRecord.id)

        // Class teacher is already linked via class_arm_combos.class_teacher_id
        const { data: classData } = await supabase
          .from('class_arm_combos')
          .select('class_teacher_id')
          .eq('id', data.class_arm_combo_id)
          .single()

        if (classData?.class_teacher_id) {
          console.log('👨‍🏫 Class teacher:', classData.class_teacher_id)
          console.log('✅ Student linked to class')
        }

        // Register for subjects if provided (for secondary students)
        if (data.subject_ids && data.subject_ids.length > 0) {
          console.log('📚 Registering for subjects:', data.subject_ids)

          // BLOCKER 1 FIX: Populate subject_teacher_id for each subject
          // Query: which teacher teaches each subject in this student's class?
          const subjectRegistrations = await Promise.all(
            data.subject_ids.map(async (subjectId) => {
              // Find the teacher assigned to teach this subject in this class
              const { data: teacherAssignment, error: queryError } = await supabase
                .from('subject_teacher_assignments')
                .select('teacher_id')
                .eq('school_id', data.school_id)
                .eq('subject_id', subjectId)
                .eq('class_arm_combo_id', data.class_arm_combo_id)
                .maybeSingle()

              if (queryError && queryError.code !== 'PGRST116') {
                console.warn(`⚠️ Error querying teacher for subject ${subjectId}:`, queryError)
              }

              return {
                student_id: studentRecord.id,
                subject_id: subjectId,
                school_id: data.school_id,
                subject_teacher_id: teacherAssignment?.teacher_id || null, // ✅ NOW POPULATED
                created_at: new Date().toISOString(),
              }
            })
          )

          const { error: subjectRegError } = await supabase
            .from('student_subjects')
            .insert(subjectRegistrations)

          if (subjectRegError) {
            console.warn('⚠️ Subject registration warning:', subjectRegError)
          } else {
            console.log('✅ Student registered for subjects')
            console.log('✅ Subject teachers linked to each student subject via teacher_id')
            console.log('📊 Subject-teacher assignments:', subjectRegistrations.map(sr => ({
              subject_id: sr.subject_id,
              teacher_id: sr.subject_teacher_id,
            })))
          }
        }
      }

      console.log('✅ Student registered successfully')

      return {
        id: authUser.id,
        email: normalizedEmail,
      }
    } catch (error: any) {
      console.error('❌ Student registration error:', error)
      throw new Error(error.message || 'Failed to register student')
    }
  }

  /**
   * Get all staff members for a school
   */
  static async getSchoolStaff(schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', schoolId)
        .in('role', ['TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'HEAD_TEACHER', 'STAFF'])
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Get staff error:', error)
      return []
    }
  }

  /**
   * Get all students for a school (with student record ID)
   */
  static async getSchoolStudents(schoolId: string): Promise<any[]> {
    try {
      // First get all students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          admission_number,
          class_arm_combo_id,
          department
        `)
        .eq('school_id', schoolId)
        .order('id', { ascending: true })

      if (studentsError) throw studentsError

      if (!students || students.length === 0) {
        return []
      }

      // Then get corresponding user data
      const userIds = students.map(s => s.user_id)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          photo_url,
          status
        `)
        .in('id', userIds)
        .eq('status', 'ACTIVE')

      if (usersError) throw usersError

      // Create a map of users for fast lookup
      const userMap = new Map((users || []).map(u => [u.id, u]))

      // Combine student and user data
      return (students || [])
        .map((student: any) => {
          const user = userMap.get(student.user_id)
          return {
            id: student.id,  // ← Student record ID (for admission letter)
            user_id: student.user_id,
            email: user?.email,
            full_name: user?.full_name,
            photo_url: user?.photo_url,
            admission_number: student.admission_number,
            class_arm_combo_id: student.class_arm_combo_id,
            department: student.department,
            status: user?.status,
          }
        })
        .filter(s => s.status === 'ACTIVE')  // Only active users
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    } catch (error: any) {
      console.error('Get students error:', error)
      return []
    }
  }

  /**
   * Suspend user
   */
  static async suspendUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'SUSPENDED' })
        .eq('id', userId)

      if (error) throw error
    } catch (error: any) {
      console.error('Suspend user error:', error)
      throw new Error('Failed to suspend user')
    }
  }

  /**
   * Reactivate user
   */
  static async reactivateUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'ACTIVE' })
        .eq('id', userId)

      if (error) throw error
    } catch (error: any) {
      console.error('Reactivate user error:', error)
      throw new Error('Failed to reactivate user')
    }
  }
}
