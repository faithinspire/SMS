import { supabase } from '@/lib/supabase-client'
import { supabase } from '@/lib/supabase-client'

export interface StaffProfile {
  id: string
  user_id: string
  school_id: string
  full_name: string
  email: string
  phone?: string
  gender?: string
  address?: string
  state?: string
  lga?: string
  status: string
  role: string
  position?: string
  department?: string
  employment_date?: string
  salary?: number
  bank_name?: string
  account_number?: string
  account_holder_name?: string
  class_assignment?: {
    class_id: string
    class_name: string
    class_arm_combo_id: string
    arm_name: string
    is_class_teacher: boolean
  }
  subject_assignments?: Array<{
    subject_id: string
    subject_name: string
    class_arm_combo_id: string
  }>
}

export class StaffService {
  /**
   * Get all staff members for a school
   */
  static async getStaffList(schoolId: string): Promise<StaffProfile[]> {
    try {
      // Query users table for staff roles
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          phone,
          gender,
          address,
          state,
          lga,
          status,
          role,
          school_id
        `)
        .eq('school_id', schoolId)
        .in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'])
        .order('full_name', { ascending: true })

      if (error) throw error

      // For each user, fetch their staff record if it exists
      const staffProfiles: StaffProfile[] = []

      for (const user of data || []) {
        const { data: staffRecord } = await supabase
          .from('staff')
          .select(`
            id,
            user_id,
            school_id,
            position,
            department,
            employment_date,
            salary,
            bank_name,
            account_number,
            account_holder_name
          `)
          .eq('user_id', user.id)
          .eq('school_id', schoolId)
          .maybeSingle()

        // Fetch class assignment
        const { data: classAssignment } = await supabase
          .from('teacher_class_assignments')
          .select(`
            id,
            class_arm_combo_id,
            is_class_teacher,
            class_arm_combos (
              id,
              class_id,
              arm_id,
              classes (id, name),
              arms (id, name)
            )
          `)
          .eq('teacher_id', user.id)
          .eq('school_id', schoolId)
          .maybeSingle()

        staffProfiles.push({
          id: staffRecord?.id || user.id,
          user_id: user.id,
          school_id: schoolId,
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone,
          gender: user.gender,
          address: user.address,
          state: user.state,
          lga: user.lga,
          status: user.status || 'ACTIVE',
          role: user.role || '',
          position: staffRecord?.position,
          department: staffRecord?.department,
          employment_date: staffRecord?.employment_date,
          salary: staffRecord?.salary,
          bank_name: staffRecord?.bank_name,
          account_number: staffRecord?.account_number,
          account_holder_name: staffRecord?.account_holder_name,
          class_assignment: classAssignment ? {
            class_id: classAssignment.class_arm_combos?.class_id || '',
            class_name: classAssignment.class_arm_combos?.classes?.name || '',
            class_arm_combo_id: classAssignment.class_arm_combo_id || '',
            arm_name: classAssignment.class_arm_combos?.arms?.name || '',
            is_class_teacher: classAssignment.is_class_teacher || false,
          } : undefined,
        })
      }

      return staffProfiles
    } catch (error: any) {
      console.error('Get staff list error:', error)
      throw new Error(error.message || 'Failed to fetch staff list')
    }
  }

  /**
   * Get a single staff member by ID
   */
  static async getStaffById(staffId: string, schoolId: string): Promise<StaffProfile | null> {
    try {
      // staffId can be either users.id or staff.id
      // First try as users.id
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          phone,
          gender,
          address,
          state,
          lga,
          status,
          role,
          school_id
        `)
        .eq('id', staffId)
        .eq('school_id', schoolId)
        .maybeSingle()

      if (!userData && !userError) {
        // Try as staff.id
        const { data: staffByStaffId } = await supabase
          .from('staff')
          .select('user_id')
          .eq('id', staffId)
          .eq('school_id', schoolId)
          .maybeSingle()

        if (staffByStaffId) {
          const result = await supabase
            .from('users')
            .select(`
              id,
              full_name,
              email,
              phone,
              gender,
              address,
              state,
              lga,
              status,
              role,
              school_id
            `)
            .eq('id', staffByStaffId.user_id)
            .eq('school_id', schoolId)
            .maybeSingle()
          userData = result.data
        }
      }

      if (!userData) return null

      // Fetch staff record
      const { data: staffRecord } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          school_id,
          position,
          department,
          employment_date,
          salary,
          bank_name,
          account_number,
          account_holder_name
        `)
        .eq('user_id', userData.id)
        .eq('school_id', schoolId)
        .maybeSingle()

      // Fetch class assignment
      const { data: classAssignment } = await supabase
        .from('teacher_class_assignments')
        .select(`
          id,
          class_arm_combo_id,
          is_class_teacher,
          class_arm_combos (
            id,
            class_id,
            arm_id,
            classes (id, name),
            arms (id, name)
          )
        `)
        .eq('teacher_id', userData.id)
        .eq('school_id', schoolId)
        .maybeSingle()

      // Fetch subject assignments
      const { data: subjectAssignments } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          id,
          subject_id,
          class_arm_combo_id,
          subjects (id, name),
          class_arm_combos (
            id,
            classes (id, name),
            arms (id, name)
          )
        `)
        .eq('teacher_id', userData.id)
        .eq('school_id', schoolId)

      return {
        id: staffRecord?.id || userData.id,
        user_id: userData.id,
        school_id: schoolId,
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone,
        gender: userData.gender,
        address: userData.address,
        state: userData.state,
        lga: userData.lga,
        status: userData.status || 'ACTIVE',
        role: userData.role || '',
        position: staffRecord?.position,
        department: staffRecord?.department,
        employment_date: staffRecord?.employment_date,
        salary: staffRecord?.salary,
        bank_name: staffRecord?.bank_name,
        account_number: staffRecord?.account_number,
        account_holder_name: staffRecord?.account_holder_name,
        class_assignment: classAssignment ? {
          class_id: classAssignment.class_arm_combos?.class_id || '',
          class_name: classAssignment.class_arm_combos?.classes?.name || '',
          class_arm_combo_id: classAssignment.class_arm_combo_id || '',
          arm_name: classAssignment.class_arm_combos?.arms?.name || '',
          is_class_teacher: classAssignment.is_class_teacher || false,
        } : undefined,
        subject_assignments: (subjectAssignments || []).map(sa => ({
          subject_id: sa.subject_id || '',
          subject_name: sa.subjects?.name || '',
          class_arm_combo_id: sa.class_arm_combo_id || '',
        })),
      }
    } catch (error: any) {
      console.error('Get staff by ID error:', error)
      throw new Error(error.message || 'Failed to fetch staff')
    }
  }

  /**
   * Update staff information
   */
  static async updateStaff(
    staffId: string,
    updates: Partial<StaffProfile>,
    schoolId: string
  ): Promise<StaffProfile> {
    try {
      // Get current staff to determine user_id
      const current = await this.getStaffById(staffId, schoolId)
      if (!current) throw new Error('Staff not found')

      // Update users table
      if (updates.full_name || updates.email || updates.phone || updates.gender || 
          updates.address || updates.state || updates.lga || updates.status) {
        const { error: userError } = await supabase
          .from('users')
          .update({
            full_name: updates.full_name || current.full_name,
            email: updates.email || current.email,
            phone: updates.phone !== undefined ? updates.phone : current.phone,
            gender: updates.gender !== undefined ? updates.gender : current.gender,
            address: updates.address !== undefined ? updates.address : current.address,
            state: updates.state !== undefined ? updates.state : current.state,
            lga: updates.lga !== undefined ? updates.lga : current.lga,
            status: updates.status || current.status,
          })
          .eq('id', current.user_id)
          .eq('school_id', schoolId)

        if (userError) throw userError
      }

      // Update staff table
      if (updates.position || updates.department || updates.employment_date || 
          updates.salary || updates.bank_name || updates.account_number || 
          updates.account_holder_name) {
        // Ensure staff record exists
        let staffRecord = null
        const { data: existing } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', current.user_id)
          .eq('school_id', schoolId)
          .maybeSingle()

        if (existing) {
          const { error: staffError } = await supabase
            .from('staff')
            .update({
              position: updates.position !== undefined ? updates.position : current.position,
              department: updates.department !== undefined ? updates.department : current.department,
              employment_date: updates.employment_date !== undefined ? updates.employment_date : current.employment_date,
              salary: updates.salary !== undefined ? updates.salary : current.salary,
              bank_name: updates.bank_name !== undefined ? updates.bank_name : current.bank_name,
              account_number: updates.account_number !== undefined ? updates.account_number : current.account_number,
              account_holder_name: updates.account_holder_name !== undefined ? updates.account_holder_name : current.account_holder_name,
            })
            .eq('id', existing.id)

          if (staffError) throw staffError
        } else {
          // Create staff record if it doesn't exist
          const { error: createError } = await supabase
            .from('staff')
            .insert({
              user_id: current.user_id,
              school_id: schoolId,
              position: updates.position,
              department: updates.department,
              employment_date: updates.employment_date,
              salary: updates.salary,
              bank_name: updates.bank_name,
              account_number: updates.account_number,
              account_holder_name: updates.account_holder_name,
            })

          if (createError) throw createError
        }
      }

      // Return updated staff
      return await this.getStaffById(staffId, schoolId) as StaffProfile
    } catch (error: any) {
      console.error('Update staff error:', error)
      throw new Error(error.message || 'Failed to update staff')
    }
  }

  /**
   * Delete staff member
   */
  static async deleteStaff(staffId: string, schoolId: string): Promise<void> {
    try {
      const staff = await this.getStaffById(staffId, schoolId)
      if (!staff) throw new Error('Staff not found')

      // Delete from users table (cascades to staff, class assignments, etc.)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', staff.user_id)
        .eq('school_id', schoolId)

      if (error) throw error
    } catch (error: any) {
      console.error('Delete staff error:', error)
      throw new Error(error.message || 'Failed to delete staff')
    }
  }

  /**
   * Get school sessions for class assignment
   */
  static async getSchoolSessions(schoolId: string): Promise<Array<{ id: string; session_year: string }>> {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('id, session_year')
        .eq('school_id', schoolId)
        .order('session_year', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Get sessions error:', error)
      return []
    }
  }

  /**
   * Get school classes
   */
  static async getSchoolClasses(schoolId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Get classes error:', error)
      return []
    }
  }

  /**
   * Get class arms for a class
   */
  static async getClassArms(classId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const { data, error } = await supabase
        .from('arms')
        .select('id, name')
        .eq('class_id', classId)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Get class arms error:', error)
      return []
    }
  }

  /**
   * Get class arm combo
   */
  static async getClassArmCombo(
    classId: string,
    armId: string,
    schoolId: string
  ): Promise<{ id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('class_arm_combos')
        .select('id')
        .eq('class_id', classId)
        .eq('arm_id', armId)
        .eq('school_id', schoolId)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Get class arm combo error:', error)
      return null
    }
  }

  /**
   * Get subjects for school
   */
  static async getSchoolSubjects(schoolId: string): Promise<Array<{ id: string; name: string; code: string }>> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Get subjects error:', error)
      return []
    }
  }

  /**
   * Assign teacher to class
   */
  static async assignTeacherToClass(
    teacherId: string,
    classArmComboId: string,
    schoolId: string,
    isClassTeacher: boolean = false
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('teacher_class_assignments')
        .upsert({
          teacher_id: teacherId,
          class_arm_combo_id: classArmComboId,
          school_id: schoolId,
          is_class_teacher: isClassTeacher,
        }, {
          onConflict: 'teacher_id,class_arm_combo_id,school_id'
        })

      if (error) throw error
    } catch (error: any) {
      console.error('Assign teacher to class error:', error)
      throw new Error(error.message || 'Failed to assign teacher to class')
    }
  }

  /**
   * Assign subjects to teacher
   */
  static async assignSubjectsToTeacher(
    teacherId: string,
    classArmComboId: string,
    subjectIds: string[],
    schoolId: string
  ): Promise<void> {
    try {
      // Delete existing assignments for this teacher/class combo
      const { error: deleteError } = await supabase
        .from('subject_teacher_assignments')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('class_arm_combo_id', classArmComboId)
        .eq('school_id', schoolId)

      if (deleteError) throw deleteError

      // Insert new assignments
      if (subjectIds.length > 0) {
        const assignments = subjectIds.map(subjectId => ({
          teacher_id: teacherId,
          subject_id: subjectId,
          class_arm_combo_id: classArmComboId,
          school_id: schoolId,
        }))

        const { error: insertError } = await supabase
          .from('subject_teacher_assignments')
          .insert(assignments)

        if (insertError) throw insertError
      }
    } catch (error: any) {
      console.error('Assign subjects to teacher error:', error)
      throw new Error(error.message || 'Failed to assign subjects to teacher')
    }
  }
}
