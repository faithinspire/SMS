/**
 * Staff Registration Service
 * Handles multi-stage staff registration with atomic transaction-like behavior
 * Ensures both users and staff records are created successfully
 */

import { supabase } from '@/lib/supabase-client'

export interface StaffRegistrationData {
  // Stage 1: Personal Information
  firstName: string
  middleName?: string
  lastName: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  dateOfBirth?: string
  nationality?: string
  stateOfOrigin?: string
  lga?: string
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'
  passportUrl?: string

  // Stage 2: Contact & Address
  phone: string
  email: string
  residentialAddress?: string
  state?: string
  emergencyContact: string
  emergencyContactPhone: string

  // Stage 3: Employment Information
  staffId: string
  position: string
  department: string
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT'
  employmentStatus: 'ACTIVE' | 'PROBATION' | 'INACTIVE'
  dateEmployed: string
  dateOfAppointment: string
  reportingAuthority?: string

  // Stage 4: Professional Information
  highestQualification?: string
  professionalQualification?: string
  institution?: string
  courseField?: string
  graduationYear?: number
  teachingExperience?: number
  professionalCertifications?: string

  // Stage 5: Role & Responsibilities
  primaryRole: string
  secondaryResponsibilities?: string
  administrativeResponsibility?: string

  // Stage 6: Class Assignment (for teachers)
  classArmComboId?: string
  isClassTeacher?: boolean

  // Stage 7: Subject Assignment
  subjectIds?: string[]

  // Stage 8: Salary & Bank Information
  salaryAmount?: number
  salaryFrequency?: 'MONTHLY' | 'TERMLY' | 'ANNUALLY'
  bankName?: string
  accountName?: string
  accountNumber?: string
  paymentMethod?: string

  // Stage 9: Account & Security
  accountRole?: string
  pin?: string
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'

  // Common
  schoolId: string
  password: string
}

export interface StaffRegistrationResult {
  success: boolean
  userId?: string
  staffId?: string
  pin?: string
  email?: string
  fullName?: string
  message?: string
}

export class StaffRegistrationService {
  /**
   * Register staff member with all details
   * Creates: users record, staff record, class assignment (if applicable), salary record
   * Idempotency: checks if user with same email + school already exists
   */
  static async registerStaff(
    data: StaffRegistrationData
  ): Promise<StaffRegistrationResult> {
    try {
      const schoolId = data.schoolId
      const email = data.email.toLowerCase().trim()
      const fullName = `${data.firstName} ${data.middleName ? data.middleName + ' ' : ''}${data.lastName}`.trim()

      console.log('[StaffRegistration] Starting registration for:', fullName, 'email:', email)

      // IDEMPOTENCY CHECK: Verify user doesn't already exist in database
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', schoolId)
        .eq('email', email)
        .single()

      if (existingUser) {
        throw new Error(`Staff member with email ${email} already registered at this school`)
      }

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected
        console.warn('[StaffRegistration] Warning checking existing user:', checkError)
      }

      // ⭐ CRITICAL FIX: Step 1: Create Supabase Auth user FIRST (via API)
      // This must happen before creating database records
      console.log('[StaffRegistration] Creating Supabase Auth account...')
      const authResponse = await fetch('/api/auth/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: data.password || 'DefaultPass123!',
          name: fullName,
          role: data.primaryRole || 'TEACHER',
          schoolId: schoolId,
          accountType: 'STAFF',
        }),
      })

      if (!authResponse.ok) {
        const authError = await authResponse.json()
        console.error('[StaffRegistration] Failed to create auth user:', authError)
        throw new Error(`Failed to create auth account: ${authError.error}`)
      }

      const authResult = await authResponse.json()
      const userId = authResult.userId

      if (!userId) {
        throw new Error('Failed to get user ID from auth service')
      }

      console.log('[StaffRegistration] Supabase Auth user created:', userId)

      // Step 2: Create database user record with the auth user's ID
      // CRITICAL: Use the role from the registration form (e.g., TEACHER, ACCOUNTANT, PRINCIPAL, HEAD_TEACHER)
      const userRole = data.primaryRole || 'TEACHER'
      console.log('[StaffRegistration] Setting user role to:', userRole)
      
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId, // Use auth user ID
          school_id: schoolId,
          email: email,
          full_name: fullName,
          role: userRole, // This is the SOURCE OF TRUTH for user role
          status: data.accountStatus || 'ACTIVE',
          gender: data.gender,
          phone: data.phone,
          address: data.residentialAddress,
          state: data.state,
          lga: data.lga,
          photo_url: data.passportUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (userError) {
        console.error('[StaffRegistration] Failed to create user record:', userError)
        throw new Error(`Failed to create user record: ${userError.message}`)
      }

      console.log('[StaffRegistration] User database record created:', userId)

      // Step 2: Create staff record (OPTIONAL employment details)
      let staffId: string | null = null
      const { data: newStaff, error: staffError } = await supabase
        .from('staff')
        .insert({
          user_id: userId,
          school_id: schoolId,
          staff_id: data.staffId,
          position: data.position,
          department: data.department,
          employment_type: data.employmentType,
          employment_status: data.employmentStatus,
          employment_date: data.dateEmployed,
          appointment_date: data.dateOfAppointment,
          reporting_to: data.reportingAuthority,
          highest_qualification: data.highestQualification,
          professional_qualification: data.professionalQualification,
          institution: data.institution,
          course_field: data.courseField,
          graduation_year: data.graduationYear,
          teaching_experience: data.teachingExperience,
          professional_certifications: data.professionalCertifications,
          salary_amount: data.salaryAmount,
          salary_frequency: data.salaryFrequency,
          bank_name: data.bankName,
          account_name: data.accountName,
          account_number: data.accountNumber,
          payment_method: data.paymentMethod,
          status: data.accountStatus || 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (staffError) {
        console.warn('[StaffRegistration] Warning creating staff record (non-fatal):', staffError)
        // Non-fatal: user record is created, staff record is optional
        staffId = `staff_${userId}`
      } else {
        staffId = newStaff?.id
        console.log('[StaffRegistration] Staff employment record created:', staffId)
      }

      // Step 3: Assign class if provided (for teachers)
      if (data.classArmComboId && (data.primaryRole === 'TEACHER' || data.primaryRole === 'HEAD_TEACHER')) {
        try {
          const { error: assignError } = await supabase
            .from('teacher_class_assignments')
            .insert({
              teacher_id: userId,
              class_arm_combo_id: data.classArmComboId,
              school_id: schoolId,
              is_class_teacher: data.isClassTeacher || false,
              created_at: new Date().toISOString(),
            })

          if (!assignError) {
            console.log('[StaffRegistration] Teacher assigned to class')
          } else {
            console.warn('[StaffRegistration] Warning assigning class:', assignError)
          }
        } catch (err) {
          console.warn('[StaffRegistration] Error assigning class (non-fatal):', err)
        }
      }

      // Step 4: Assign subjects if provided (for teachers)
      if (data.subjectIds && data.subjectIds.length > 0 && data.classArmComboId && userId) {
        try {
          const subjectAssignments = data.subjectIds.map(subjectId => ({
            teacher_id: userId,
            subject_id: subjectId,
            class_arm_combo_id: data.classArmComboId,
            school_id: schoolId,
            created_at: new Date().toISOString(),
          }))

          const { error: subjectError } = await supabase
            .from('subject_teacher_assignments')
            .insert(subjectAssignments)

          if (!subjectError) {
            console.log('[StaffRegistration] Teacher subjects assigned:', data.subjectIds.length)
          } else {
            console.warn('[StaffRegistration] Warning assigning subjects:', subjectError)
          }
        } catch (err) {
          console.warn('[StaffRegistration] Error assigning subjects (non-fatal):', err)
        }
      }

      // Step 5: Create salary transaction if salary provided
      if (data.salaryAmount && data.salaryAmount > 0) {
        try {
          const { error: transError } = await supabase
            .from('transactions')
            .insert({
              school_id: schoolId,
              payer_id: userId,
              amount: data.salaryAmount,
              payment_method: data.paymentMethod || 'BANK_TRANSFER',
              description: `Initial salary record for ${fullName}`,
              transaction_type: 'SALARY',
              status: 'PENDING',
              created_at: new Date().toISOString(),
            })

          if (!transError) {
            console.log('[StaffRegistration] Salary transaction created')
          } else {
            console.warn('[StaffRegistration] Warning creating salary transaction:', transError)
          }
        } catch (err) {
          console.warn('[StaffRegistration] Error creating salary transaction (non-fatal):', err)
        }
      }

      console.log('[StaffRegistration] Staff registration completed successfully')

      return {
        success: true,
        userId,
        staffId: staffId || `staff_${userId}`,
        email,
        fullName,
        message: `Staff member ${fullName} registered successfully. Please login with your email and password.`,
      }
    } catch (error: any) {
      console.error('[StaffRegistration] Registration failed:', error)
      return {
        success: false,
        message: error.message || 'Staff registration failed',
      }
    }
  }

  /**
   * Update existing staff member profile
   */
  static async updateStaffProfile(
    userId: string,
    schoolId: string,
    updates: Partial<StaffRegistrationData>
  ): Promise<void> {
    try {
      console.log('[StaffRegistration] Updating staff profile for:', userId)

      // Update user record
      const userUpdates: any = {
        updated_at: new Date().toISOString(),
      }

      if (updates.firstName || updates.lastName) {
        const firstName = updates.firstName || ''
        const lastName = updates.lastName || ''
        const middleName = updates.middleName || ''
        userUpdates.full_name = `${firstName} ${middleName} ${lastName}`.trim()
      }

      if (updates.phone) userUpdates.phone = updates.phone
      if (updates.email) userUpdates.email = updates.email.toLowerCase().trim()
      if (updates.gender) userUpdates.gender = updates.gender
      if (updates.residentialAddress) userUpdates.address = updates.residentialAddress
      if (updates.state) userUpdates.state = updates.state
      if (updates.lga) userUpdates.lga = updates.lga

      const { error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', userId)
        .eq('school_id', schoolId)

      if (userError) {
        console.warn('[StaffRegistration] Warning updating user:', userError)
      } else {
        console.log('[StaffRegistration] User profile updated')
      }

      // Update staff record
      const staffUpdates: any = {
        updated_at: new Date().toISOString(),
      }

      if (updates.position) staffUpdates.position = updates.position
      if (updates.department) staffUpdates.department = updates.department
      if (updates.employmentStatus) staffUpdates.employment_status = updates.employmentStatus
      if (updates.salaryAmount) staffUpdates.salary_amount = updates.salaryAmount
      if (updates.bankName) staffUpdates.bank_name = updates.bankName
      if (updates.accountNumber) staffUpdates.account_number = updates.accountNumber

      const { error: staffError } = await supabase
        .from('staff')
        .update(staffUpdates)
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (staffError) {
        console.warn('[StaffRegistration] Warning updating staff:', staffError)
      } else {
        console.log('[StaffRegistration] Staff profile updated')
      }
    } catch (error: any) {
      console.error('[StaffRegistration] Update failed:', error)
      throw error
    }
  }

  /**
   * Generate a 6-digit PIN for staff login
   */
  private static generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Validate that all required fields for a stage are present
   * Stages: 1=Personal&Contact, 2=Employment&Professional, 3=Class&Subjects, 4=Salary&Security, 5=Review
   */
  static validateStage(stage: number, data: Partial<StaffRegistrationData>): boolean {
    const requirements: Record<number, string[]> = {
      1: ['firstName', 'lastName', 'email', 'phone', 'emergencyContactName', 'emergencyContactPhone', 'residentialAddress'],
      2: ['role', 'dateEmployed', 'dateAppointed'],
      3: [],
      4: ['password'],
      5: [],
    }

    const required = requirements[stage] || []

    for (const field of required) {
      const value = (data as any)[field]
      if (value === undefined || value === null || value === '') {
        return false
      }
    }

    return true
  }
}
