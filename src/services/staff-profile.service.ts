/**
 * StaffProfileService - Wraps API route for staff profile data
 * Provides staff information, subject/class assignments, salary, and appointment details
 */

export interface Subject {
  id: string
  name: string
  code: string
}

export interface ClassAssignment {
  class_name: string
  arm_name: string
}

export interface SalaryInfo {
  current_salary: number
  currency: string
  last_paid?: string
  payment_status: string
  due_date?: string
}

export interface AppointmentInfo {
  position: string
  appointment_date?: string
  department: string
  qualifications: string
}

export interface StaffProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  photo_url?: string
  role: string
  position: string
  employment_date?: string
  created_at: string
  subjects: Subject[]
  classes: ClassAssignment[]
  salary_info: SalaryInfo
  appointment_info: AppointmentInfo
}

export class StaffProfileService {
  private static readonly BASE_URL = '/api'

  /**
   * Get staff profile with all details
   */
  static async getProfile(
    schoolId: string,
    staffId: string
  ): Promise<{
    success: boolean
    profile: StaffProfile
  }> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('staff_id', staffId)

      const response = await fetch(
        `${this.BASE_URL}/staff/profile?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to fetch staff profile')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching staff profile:', error)
      throw error
    }
  }

  /**
   * Get staff basic information only
   */
  static async getBasicInfo(
    schoolId: string,
    staffId: string
  ): Promise<Partial<StaffProfile>> {
    try {
      const result = await this.getProfile(schoolId, staffId)
      const { subjects, classes, salary_info, appointment_info, ...basicInfo } =
        result.profile
      return basicInfo
    } catch (error) {
      console.error('Error fetching staff basic info:', error)
      throw error
    }
  }

  /**
   * Get staff subject assignments
   */
  static async getSubjects(
    schoolId: string,
    staffId: string
  ): Promise<Subject[]> {
    try {
      const result = await this.getProfile(schoolId, staffId)
      return result.profile.subjects
    } catch (error) {
      console.error('Error fetching staff subjects:', error)
      throw error
    }
  }

  /**
   * Get staff class assignments
   */
  static async getClasses(
    schoolId: string,
    staffId: string
  ): Promise<ClassAssignment[]> {
    try {
      const result = await this.getProfile(schoolId, staffId)
      return result.profile.classes
    } catch (error) {
      console.error('Error fetching staff classes:', error)
      throw error
    }
  }

  /**
   * Get staff salary information
   */
  static async getSalaryInfo(
    schoolId: string,
    staffId: string
  ): Promise<SalaryInfo> {
    try {
      const result = await this.getProfile(schoolId, staffId)
      return result.profile.salary_info
    } catch (error) {
      console.error('Error fetching staff salary info:', error)
      throw error
    }
  }

  /**
   * Get staff appointment information
   */
  static async getAppointmentInfo(
    schoolId: string,
    staffId: string
  ): Promise<AppointmentInfo> {
    try {
      const result = await this.getProfile(schoolId, staffId)
      return result.profile.appointment_info
    } catch (error) {
      console.error('Error fetching staff appointment info:', error)
      throw error
    }
  }
}
