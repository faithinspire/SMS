/**
 * Student Registration Service
 * 
 * Handles complete multi-stage student registration flow:
 * 1. Validate all stages
 * 2. Create user record in users table
 * 3. Create student record in students table
 * 4. Create guardian record in guardians table
 * 5. Enroll in subjects via student_subjects table
 * 6. Generate admission number with fallback
 * 7. Idempotency: prevent duplicate students for same admission_number
 */

import { supabase } from '@/lib/supabase-client'
import { StudentService } from './student.service'
import { v4 as uuidv4 } from 'uuid'

export interface GuardianInfo {
  fullName: string
  relationship: string
  phone: string
  email?: string
  address?: string
  occupation?: string
}

export interface StudentRegistrationData {
  // Stage 1: Student Personal Information
  firstName: string
  middleName?: string
  lastName: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  dateOfBirth?: string
  photoUrl?: string
  nationality?: string
  state?: string
  lga?: string
  address?: string
  phone?: string
  email: string

  // Stage 2: Guardian Information
  primaryGuardian: GuardianInfo
  secondaryGuardian?: GuardianInfo

  // Stage 3: Admission Information
  admissionNumber?: string
  admissionDate?: string
  admissionStatus?: string

  // Stage 4: Class & Session & Term
  sessionId: string
  termId: string
  classArmComboId: string
  className?: string

  // Stage 5: Subject Selection
  subjectIds: string[]

  // Stage 6: Previous School & Academic
  previousSchoolName?: string
  previousClass?: string
  previousPerformance?: string
  transferCertificate?: boolean

  // Stage 7: Medical & Emergency
  bloodType?: string
  allergies?: string
  medicalConditions?: string
  emergencyContactName?: string
  emergencyContactPhone?: string

  // Stage 8: Documents
  passportUrl?: string
  birthCertificateUrl?: string
  previousRecordsUrl?: string

  // Common
  schoolId: string
  password?: string
}

export interface StudentRegistrationResult {
  success: boolean
  studentId?: string
  userId?: string
  guardianId?: string
  admissionNumber?: string
  pin?: string
  message: string
}

export class StudentRegistrationService {
  /**
   * Complete student registration with idempotency and multi-stage validation
   */
  static async registerStudent(
    data: StudentRegistrationData
  ): Promise<StudentRegistrationResult> {
    try {
      console.log('[StudentRegistration] Starting registration for:', data.email)

      // Validation
      if (!data.email || !data.firstName || !data.lastName || !data.schoolId || !data.classArmComboId) {
        throw new Error('Missing required fields: email, firstName, lastName, schoolId, classArmComboId')
      }

      if (!data.primaryGuardian?.fullName || !data.primaryGuardian?.phone) {
        throw new Error('Missing required guardian information')
      }

      if (!data.subjectIds || data.subjectIds.length === 0) {
        throw new Error('At least one subject must be selected')
      }

      // Step 1: Check for existing student (idempotency by admission number)
      let admissionNumber = data.admissionNumber
      if (!admissionNumber) {
        admissionNumber = await this.generateAdmissionNumber(
          data.schoolId,
          data.classArmComboId
        )
      }

      console.log('[StudentRegistration] Using admission number:', admissionNumber)

      const { data: existingStudent } = await supabase
        .from('students')
        .select('id, admission_number')
        .eq('school_id', data.schoolId)
        .eq('admission_number', admissionNumber)
        .single()

      if (existingStudent) {
        console.warn('[StudentRegistration] Student already exists with this admission number:', admissionNumber)
        return {
          success: false,
          message: `Student with admission number ${admissionNumber} already exists`,
        }
      }

      // Step 2: Create user record
      const fullName = `${data.firstName}${data.middleName ? ' ' + data.middleName : ''} ${data.lastName}`
      const userId = uuidv4()

      console.log('[StudentRegistration] Creating user record:', userId)

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            school_id: data.schoolId,
            email: data.email,
            full_name: fullName,
            role: 'STUDENT',
            status: 'ACTIVE',
            photo_url: data.photoUrl || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (userError) {
        console.error('[StudentRegistration] Error creating user:', userError)
        throw new Error(`Failed to create user: ${userError.message}`)
      }

      console.log('[StudentRegistration] User created:', newUser.id)

      // Step 3: Create student record
      const studentId = uuidv4()

      console.log('[StudentRegistration] Creating student record:', studentId)

      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert([
          {
            id: studentId,
            user_id: newUser.id,
            school_id: data.schoolId,
            admission_number: admissionNumber,
            date_of_birth: data.dateOfBirth || null,
            class_arm_combo_id: data.classArmComboId,
            photo_url: data.photoUrl || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (studentError) {
        console.error('[StudentRegistration] Error creating student:', studentError)
        throw new Error(`Failed to create student: ${studentError.message}`)
      }

      console.log('[StudentRegistration] Student record created:', newStudent.id)

      // Step 4: Create guardian record
      let guardianId: string | undefined
      if (data.primaryGuardian) {
        guardianId = uuidv4()

        console.log('[StudentRegistration] Creating guardian record:', guardianId)

        const { error: guardianError } = await supabase
          .from('guardians')
          .insert([
            {
              id: guardianId,
              student_id: newStudent.id,
              school_id: data.schoolId,
              full_name: data.primaryGuardian.fullName,
              relationship: data.primaryGuardian.relationship || 'Parent',
              phone: data.primaryGuardian.phone,
              email: data.primaryGuardian.email || null,
              address: data.primaryGuardian.address || null,
              occupation: data.primaryGuardian.occupation || null,
              is_primary: true,
              created_at: new Date().toISOString(),
            },
          ])

        if (guardianError) {
          console.warn('[StudentRegistration] Warning creating guardian:', guardianError)
          // Non-fatal - continue without guardian
        } else {
          console.log('[StudentRegistration] Guardian record created')
        }
      }

      // Step 5: Enroll in subjects
      if (data.subjectIds && data.subjectIds.length > 0) {
        console.log('[StudentRegistration] Enrolling in subjects:', data.subjectIds.length)

        const studentSubjectRecords = data.subjectIds.map((subjectId) => ({
          student_id: newStudent.id,
          subject_id: subjectId,
          school_id: data.schoolId,
          created_at: new Date().toISOString(),
        }))

        const { error: subjectError } = await supabase
          .from('student_subjects')
          .insert(studentSubjectRecords)

        if (subjectError) {
          // Log but don't fail - subjects can be added manually
          console.warn('[StudentRegistration] Warning enrolling subjects:', subjectError)
        } else {
          console.log('[StudentRegistration] Subject enrollment completed')
        }
      }

      // Step 6: Generate PIN for student/guardian login
      const pin = this.generatePin()

      console.log('[StudentRegistration] Registration completed successfully')

      return {
        success: true,
        studentId: newStudent.id,
        userId: newUser.id,
        guardianId: guardianId,
        admissionNumber: admissionNumber,
        pin: pin,
        message: `Student ${fullName} registered successfully with admission number ${admissionNumber}. PIN: ${pin}`,
      }
    } catch (error: any) {
      console.error('[StudentRegistration] Registration failed:', error)
      return {
        success: false,
        message: error.message || 'Student registration failed',
      }
    }
  }

  /**
   * Generate unique admission number for a student
   * Format: YEAR-CLASSPREFIX-SEQUENCE or YEAR-ADM-UUID (fallback)
   * Example: 2026-SSA-0001 or 2026-ADM-A1B2C3D4 (if class data incomplete)
   */
  private static async generateAdmissionNumber(
    schoolId: string,
    classArmComboId: string
  ): Promise<string> {
    try {
      const year = new Date().getFullYear()

      // Get class info for prefix
      const { data: classCombo, error: classError } = await supabase
        .from('class_arm_combos')
        .select('classes(name, level), arms(name)')
        .eq('id', classArmComboId)
        .single()

      if (classError || !classCombo?.classes?.name) {
        throw new Error('Class data incomplete')
      }

      const className = (classCombo.classes as any).name || 'CLASS'
      const armName = (classCombo.arms as any)?.name?.substring(0, 1) || 'X'
      const classPrefix = className.substring(0, 3).toUpperCase().replace(/\s+/g, '')

      // Get count of existing students for this class to create sequence
      const { count: studentCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('class_arm_combo_id', classArmComboId)

      const sequence = ((studentCount || 0) + 1).toString().padStart(4, '0')
      const admissionNumber = `${year}-${classPrefix}${armName}-${sequence}`

      console.log('[StudentRegistration] Generated admission number:', admissionNumber)
      return admissionNumber
    } catch (err) {
      console.warn('[StudentRegistration] Admission number generation failed, using UUID fallback:', err)
      // Fallback: Use UUID-based format when class data unavailable
      const year = new Date().getFullYear()
      const uuid = uuidv4().substring(0, 8).toUpperCase()
      const fallbackNumber = `${year}-ADM-${uuid}`

      console.log('[StudentRegistration] Using fallback admission number:', fallbackNumber)
      return fallbackNumber
    }
  }

  /**
   * Generate a random 6-digit PIN for student login
   */
  private static generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Validate that all required fields for a stage are present
   * Stages: 1=Personal, 2=Guardian, 3=Admission, 4=Class, 5=Subjects, 6=Previous, 7=Medical, 8=Documents, 9=Review, 10=Complete
   */
  static validateStage(stage: number, data: Partial<StudentRegistrationData>): boolean {
    const requirements: Record<number, string[]> = {
      1: ['firstName', 'lastName', 'gender', 'email'],
      2: ['primaryGuardian'],
      3: ['admissionDate', 'admissionStatus'],
      4: ['sessionId', 'termId', 'classArmComboId'],
      5: ['subjectIds'],
      6: [],
      7: [],
      8: [],
      9: [],
      10: [],
    }

    const required = requirements[stage] || []

    for (const field of required) {
      const value = (data as any)[field]

      if (field === 'primaryGuardian') {
        // Check if guardian has required fields
        if (!value?.fullName || !value?.phone) {
          return false
        }
      } else if (field === 'subjectIds') {
        // Check if at least one subject selected
        if (!Array.isArray(value) || value.length === 0) {
          return false
        }
      } else {
        // Regular field check
        if (value === undefined || value === null || value === '') {
          return false
        }
      }
    }

    return true
  }
}
