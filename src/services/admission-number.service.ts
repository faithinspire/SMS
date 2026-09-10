import { supabase } from '@/lib/supabase-client'

/**
 * Admission Number Service
 * Generates unique, auto-incrementing admission numbers for students
 * Format: YYYY-SCHOOLCODE-SEQUENCE
 * Example: 2026-LWS-0001
 */
export class AdmissionNumberService {
  /**
   * Generate next admission number for a student
   * Automatically generates unique number based on school and year
   */
  static async generateAdmissionNumber(schoolId: string): Promise<string> {
    try {
      const year = new Date().getFullYear()

      // Get school details for school code
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', schoolId)
        .single()

      if (schoolError || !school) {
        throw new Error('School not found')
      }

      // Extract school code from name (first 3 letters, uppercase)
      const schoolCode = this.extractSchoolCode(school.name)

      // Get the count of students registered in this school this year
      // to determine next sequence number
      const { data: existingStudents, error: countError } = await supabase
        .from('students')
        .select('id, admission_number')
        .eq('school_id', schoolId)
        .like('admission_number', `${year}-${schoolCode}-%`)

      if (countError) {
        console.warn('Error counting existing students:', countError)
      }

      // Calculate next sequence number
      const sequence = (existingStudents?.length || 0) + 1
      const paddedSequence = String(sequence).padStart(4, '0')

      const admissionNumber = `${year}-${schoolCode}-${paddedSequence}`

      console.log('✅ Generated admission number:', admissionNumber)
      return admissionNumber
    } catch (error: any) {
      console.error('Error generating admission number:', error)
      throw new Error(`Failed to generate admission number: ${error.message}`)
    }
  }

  /**
   * Extract school code from school name
   * Takes first 3 letters, converts to uppercase
   * Examples:
   *   "Leadway Schools" → "LEA"
   *   "St. John's Academy" → "ST."
   *   "ABC Secondary School" → "ABC"
   */
  private static extractSchoolCode(schoolName: string): string {
    // Remove extra spaces and take first 3 characters
    const code = schoolName
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 3)
      .toUpperCase()
      .replace(/\s/g, '')

    // If code is less than 3 chars, pad with 'X'
    return code.length < 3 ? code + 'X'.repeat(3 - code.length) : code
  }

  /**
   * Verify admission number format
   * Returns true if valid format
   */
  static isValidAdmissionNumberFormat(admissionNumber: string): boolean {
    // Format: YYYY-XXX-NNNN where XXX is school code, NNNN is sequence
    const regex = /^\d{4}-[A-Z]{3}-\d{4}$/
    return regex.test(admissionNumber)
  }

  /**
   * Get all admission numbers for a school in a specific year
   */
  static async getAdmissionNumbersForYear(
    schoolId: string,
    year: number
  ): Promise<string[]> {
    try {
      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .single()

      if (!school) throw new Error('School not found')

      const schoolCode = this.extractSchoolCode(school.name)
      const pattern = `${year}-${schoolCode}-%`

      const { data: students, error } = await supabase
        .from('students')
        .select('admission_number')
        .eq('school_id', schoolId)
        .like('admission_number', pattern)

      if (error) throw error

      return (students || []).map(s => s.admission_number)
    } catch (error: any) {
      console.error('Error fetching admission numbers:', error)
      throw error
    }
  }

  /**
   * Parse admission number to extract components
   */
  static parseAdmissionNumber(admissionNumber: string): {
    year: number
    schoolCode: string
    sequence: number
  } | null {
    const match = admissionNumber.match(/^(\d{4})-([A-Z]{3})-(\d{4})$/)
    if (!match) return null

    return {
      year: parseInt(match[1]),
      schoolCode: match[2],
      sequence: parseInt(match[3]),
    }
  }
}
