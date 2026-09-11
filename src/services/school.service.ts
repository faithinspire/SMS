import { supabase } from '@/lib/supabase-client'

export interface School {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  logo_url?: string
  type?: string
  admin_email?: string
  admin_password?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export class SchoolService {
  // Register a new school (Super Admin only)
  // Uses API endpoint to bypass RLS
  static async registerSchool(data: Partial<School>): Promise<School> {
    try {
      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          logo_url: data.logo_url,
          type: data.type || 'BOTH',
          admin_email: data.admin_email,
          admin_password: data.admin_password,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register school')
      }

      const school = await response.json()
      return school
    } catch (error: any) {
      console.error('School registration error:', error)
      throw new Error(error.message || 'Failed to register school')
    }
  }

  // Get school by ID
  static async getSchoolById(schoolId: string): Promise<School> {
    try {
      const response = await fetch(`/api/schools/${schoolId}`)

      if (!response.ok) {
        throw new Error('Failed to get school')
      }

      const school = await response.json()
      return school
    } catch (error: any) {
      console.error('Get school error:', error)
      throw new Error(error.message || 'Failed to get school')
    }
  }

  // Get school details (alias for getSchoolById)
  static async getSchoolDetails(schoolId: string): Promise<School> {
    return this.getSchoolById(schoolId)
  }

  // Get all schools (Super Admin)
  static async getAllSchools(): Promise<School[]> {
    try {
      const response = await fetch('/api/schools')

      if (!response.ok) {
        throw new Error('Failed to get schools')
      }

      const schools = await response.json()
      return schools || []
    } catch (error: any) {
      console.error('Get all schools error:', error)
      return []
    }
  }

  // Update school
  static async updateSchool(schoolId: string, updates: Partial<School>): Promise<School> {
    try {
      const response = await fetch(`/api/schools/${schoolId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update school')
      }

      const school = await response.json()
      return school
    } catch (error: any) {
      console.error('Update school error:', error)
      throw new Error(error.message || 'Failed to update school')
    }
  }

  // Pause school operation
  static async pauseSchool(schoolId: string): Promise<School> {
    return this.updateSchool(schoolId, { status: 'SUSPENDED' })
  }

  // Resume school operation
  static async resumeSchool(schoolId: string): Promise<School> {
    return this.updateSchool(schoolId, { status: 'ACTIVE' })
  }

  // Delete school (Super Admin)
  static async deleteSchool(schoolId: string): Promise<void> {
    try {
      // Get auth token for superadmin verification
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Authentication required for school deletion')
      }

      const response = await fetch(`/api/superadmin/schools/${schoolId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete school')
      }
    } catch (error: any) {
      console.error('Delete school error:', error)
      throw new Error(error.message || 'Failed to delete school')
    }
  }

  // Get school admin credentials
  static async getSchoolCredentials(schoolId: string): Promise<{ email: string; password: string }> {
    try {
      const school = await this.getSchoolById(schoolId)
      return {
        email: school.admin_email || '',
        password: school.admin_password || '',
      }
    } catch (error: any) {
      console.error('Get credentials error:', error)
      throw new Error('Failed to get school credentials')
    }
  }
}
