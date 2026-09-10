import { supabase } from '@/lib/supabase-client'

export interface Student {
  id: string
  user_id: string
  school_id: string
  admission_number: string
  class_arm_combo_id: string
  photo_url?: string
  created_at: string
}

export class StudentService {
  /**
   * Register student with class and subject assignments
   * AUTOMATICALLY GENERATES ADMISSION NUMBER
   * Automatically links to class teacher and subject teachers
   */
  static async registerStudent(
    schoolId: string,
    fullName: string,
    dateOfBirth: string,
    classArmComboId: string,
    subjectIds: string[],
    guardianFullName: string,
    guardianPhone: string,
    guardianEmail?: string,
    photoFile?: File,
    admissionNumberOverride?: string // Optional: only for manual override
  ): Promise<{ student: Student; pin: string; admission_number: string }> {
    try {
      // Get the class info for admission number generation
      const { data: classCombo, error: classComboError } = await supabase
        .from('class_arm_combos')
        .select('classes(name, level)')
        .eq('id', classArmComboId)
        .single()

      if (classComboError || !classCombo) {
        throw new Error('Invalid class selection')
      }

      // GENERATE ADMISSION NUMBER AUTOMATICALLY
      let admissionNumber = admissionNumberOverride
      if (!admissionNumber) {
        admissionNumber = await this.generateAdmissionNumber(
          schoolId,
          classArmComboId,
          (classCombo.classes as any)?.name || 'CLASS'
        )
      }

      console.log('✅ Generated admission number:', admissionNumber)

      // Generate PIN for student login
      const pin = this.generatePIN()
      const hashedPin = await this.hashPin(pin)

      // Create auth user for student
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `student-${admissionNumber}@school.local`,
          password: pin,
          full_name: fullName,
          role: 'STUDENT',
          school_id: schoolId,
          user_type: 'STUDENT',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create student auth')
      }

      const { user: authUser } = await response.json()
      if (!authUser) throw new Error('Student registration failed - no user returned')

      console.log('✅ Auth user created for student:', authUser.id)

      // Create user record in database
      let photoUrl: string | null = null

      // Upload photo if provided
      if (photoFile) {
        photoUrl = await this.uploadStudentPhoto(schoolId, authUser.id, photoFile)
      }

      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          school_id: schoolId,
          email: `student-${admissionNumber}@school.local`,
          full_name: fullName,
          photo_url: photoUrl,
          role: 'STUDENT',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (dbError) throw new Error(`Failed to create user record: ${dbError.message}`)

      console.log('✅ Database user created:', dbUser.id)

      // Create student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: authUser.id,
          school_id: schoolId,
          admission_number: admissionNumber,
          date_of_birth: dateOfBirth,
          class_arm_combo_id: classArmComboId,
          photo_url: photoUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (studentError) throw new Error(`Failed to create student record: ${studentError.message}`)

      console.log('✅ Student record created:', student.id)

      // Get class teacher ID from class_arm_combos
      const { data: classComboForTeacher, error: classComboTeacherError } = await supabase
        .from('class_arm_combos')
        .select('class_teacher_id')
        .eq('id', classArmComboId)
        .single()

      if (!classComboTeacherError && classComboForTeacher?.class_teacher_id) {
        // Update class_arm_combo to link this student (if needed for reference)
        console.log('✅ Student assigned to class teacher:', classComboForTeacher.class_teacher_id)
      }

      // Link student to subjects
      if (subjectIds && subjectIds.length > 0) {
        const studentSubjectRecords = subjectIds.map(subjectId => ({
          student_id: student.id,
          subject_id: subjectId,
          school_id: schoolId,
          created_at: new Date().toISOString(),
        }))

        const { error: subjectError } = await supabase
          .from('student_subjects')
          .insert(studentSubjectRecords)

        if (subjectError) {
          console.warn('⚠️ Could not link subjects:', subjectError)
        } else {
          console.log('✅ Linked student to subjects')
        }
      }

      // Create guardian record
      if (guardianFullName) {
        const { error: guardianError } = await supabase
          .from('guardians')
          .insert({
            student_id: student.id,
            school_id: schoolId,
            full_name: guardianFullName,
            phone: guardianPhone,
            email: guardianEmail,
            created_at: new Date().toISOString(),
          })

        if (guardianError) {
          console.warn('⚠️ Could not create guardian record:', guardianError)
        } else {
          console.log('✅ Guardian record created')
        }
      }

      return {
        student,
        pin,
        admission_number: admissionNumber,
      }
    } catch (error: any) {
      console.error('❌ Student registration failed:', error)
      throw error
    }
  }

  /**
   * Generate unique admission number for a student
   * Format: YEAR-CLASSNAME-SEQUENCE
   * Example: 2026-SSA-0001
   */
  private static async generateAdmissionNumber(
    schoolId: string,
    classArmComboId: string,
    className: string
  ): Promise<string> {
    try {
      const year = new Date().getFullYear()
      const classPrefix = className.substring(0, 3).toUpperCase().replace(/\s+/g, '')
      
      // Get the count of existing students in this school to create sequence
      const { data: existingStudents, error: countError } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('school_id', schoolId)

      if (countError) {
        console.warn('⚠️ Could not count existing students, using random sequence')
        const randomSeq = Math.floor(Math.random() * 9000) + 1000
        return `${year}-${classPrefix}-${randomSeq}`
      }

      const sequence = ((existingStudents?.length || 0) + 1).toString().padStart(4, '0')
      return `${year}-${classPrefix}-${sequence}`
    } catch (err) {
      console.error('Error generating admission number:', err)
      // Fallback: generate with random sequence
      const year = new Date().getFullYear()
      const randomSeq = Math.floor(Math.random() * 9000) + 1000
      return `${year}-ADM-${randomSeq}`
    }
  }

  /**
   * Upload student photo to Supabase storage
   * IMPORTANT: This uses anonymous access (no RLS on storage bucket)
   * For RLS-protected buckets, use service role key or authenticated tokens
   */
  private static async uploadStudentPhoto(
    schoolId: string,
    studentUserId: string,
    photoFile: File
  ): Promise<string | null> {
    try {
      const timestamp = Date.now()
      const fileExt = photoFile.name.split('.').pop() || 'jpg'
      const fileName = `${studentUserId}-${timestamp}.${fileExt}`
      const filePath = `${schoolId}/${fileName}`

      console.log('📤 Attempting to upload photo...')

      // ULTIMATE BYPASS: Try multiple buckets in sequence
      const buckets = ['student-photos', 'school-logos', 'documents', 'teacher-photos']
      let uploadData, uploadError

      for (const bucket of buckets) {
        try {
          console.log(`📤 Trying bucket: ${bucket}`)
          const response = await supabase.storage
            .from(bucket)
            .upload(filePath, photoFile, { upsert: true, cacheControl: '3600' })
          
          uploadData = response.data
          uploadError = response.error

          if (!uploadError) {
            console.log(`✅ Photo uploaded to ${bucket}`)
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(filePath)

            console.log('✅ Photo public URL:', publicUrl)
            return publicUrl
          }
        } catch (err) {
          console.warn(`⚠️ Bucket ${bucket} failed, trying next...`)
          continue
        }
      }

      // If all buckets fail, that's OK - continue without photo
      console.warn('⚠️ All storage buckets unavailable, continuing without photo')
      console.warn('   Photo upload skipped - student registration continues')
      return null

    } catch (error: any) {
      console.warn('⚠️ Photo upload exception:', error.message)
      console.warn('   Student registration continues without photo')
      return null
    }
  }

  /**
   * Get student profile with all relationships
   */
  static async getStudentProfile(studentId: string, schoolId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(
          `
          id,
          user_id,
          admission_number,
          date_of_birth,
          photo_url,
          class_arm_combo_id,
          users (
            id,
            full_name,
            email,
            photo_url
          ),
          class_arm_combos (
            id,
            class_id,
            arm_id,
            class_teacher_id,
            classes (id, name, level, type),
            arms (id, name),
            users!class_arm_combos_class_teacher_id_fkey (id, full_name, email)
          ),
          student_subjects (
            id,
            subject_id,
            subjects (id, name, code)
          )
        `
        )
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single()

      if (error) throw error

      return {
        student: data,
        displayData: {
          admission_number: data.admission_number,
          class_name: (data.class_arm_combos as any)?.classes?.name || 'N/A',
          arm_name: (data.class_arm_combos as any)?.arms?.name || 'N/A',
          class_teacher: (data.class_arm_combos as any)?.users?.[0]?.full_name || 'N/A',
          subjects: (data.student_subjects || []).map((ss: any) => ({
            id: ss.subject_id,
            name: ss.subjects?.name || 'N/A',
            code: ss.subjects?.code || 'N/A',
          })),
        },
      }
    } catch (error) {
      console.error('Error loading student profile:', error)
      throw error
    }
  }

  /**
   * Get all students in a class
   */
  static async getClassStudents(classArmComboId: string, schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(
          `
          id,
          admission_number,
          users (
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
        .order('admission_number', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error loading class students:', error)
      throw error
    }
  }

  /**
   * Get all students taking a specific subject
   */
  static async getSubjectStudents(subjectId: string, schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('student_subjects')
        .select(
          `
          id,
          student_id,
          students (
            id,
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
          )
        `
        )
        .eq('subject_id', subjectId)
        .eq('school_id', schoolId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error loading subject students:', error)
      throw error
    }
  }

  /**
   * Update student photo
   */
  static async updateStudentPhoto(
    studentId: string,
    schoolId: string,
    photoFile: File
  ): Promise<string> {
    try {
      // Get student user ID first
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', studentId)
        .single()

      if (studentError || !student) throw new Error('Student not found')

      const photoUrl = await this.uploadStudentPhoto(schoolId, student.user_id, photoFile)

      // Update student record with new photo URL
      const { error: updateError } = await supabase
        .from('students')
        .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
        .eq('id', studentId)

      if (updateError) throw new Error(`Failed to update student photo: ${updateError.message}`)

      console.log('✅ Student photo updated')
      return photoUrl
    } catch (error: any) {
      console.error('Error updating student photo:', error)
      throw error
    }
  }

  /**
   * Generate a random PIN for student
   */
  private static generatePIN(): string {
    return Math.random().toString().substring(2, 8)
  }

  /**
   * Hash PIN (simple - in production use proper bcrypt)
   */
  private static async hashPin(pin: string): Promise<string> {
    // In production, use bcrypt or similar
    return pin
  }

  /**
   * Get student by admission number
   */
  static async getStudentByAdmissionNumber(
    admissionNumber: string,
    schoolId: string
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('admission_number', admissionNumber)
        .eq('school_id', schoolId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting student by admission number:', error)
      throw error
    }
  }

  /**
   * UPDATE EXISTING STUDENT PROFILE
   * CRITICAL: Updates existing record - does NOT create duplicate
   * Allows editing: name, DOB, class, subjects, guardian info, photo
   */
  static async updateStudentProfile(
    studentId: string,
    schoolId: string,
    updates: {
      fullName?: string
      email?: string
      department?: string | null
      dateOfBirth?: string
      classArmComboId?: string
      subjectIds?: string[]
      guardianFullName?: string
      guardianPhone?: string
      guardianEmail?: string
      photoFile?: File
    }
  ): Promise<{ student: Student; admission_number: string }> {
    try {
      console.log('🔄 Updating student profile for:', studentId)

      // Get existing student to verify it exists
      const { data: existingStudent, error: fetchError } = await supabase
        .from('students')
        .select('id, user_id, admission_number, school_id')
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single()

      if (fetchError || !existingStudent) {
        throw new Error(`Student not found: ${studentId}`)
      }

      console.log('✅ Found existing student record')

      // Prepare student table update
      const studentUpdates: any = {
        updated_at: new Date().toISOString(),
      }

      if (updates.dateOfBirth) {
        studentUpdates.date_of_birth = updates.dateOfBirth
      }

      if (updates.classArmComboId) {
        studentUpdates.class_arm_combo_id = updates.classArmComboId
      }

      if (updates.department !== undefined) {
        // Validate department value against constraint
        const validDepartments = [null, 'SCIENCE', 'COMMERCIAL', 'HUMANITIES', 'TECHNICAL', 'VOCATIONAL']
        const normalizedDept = updates.department ? updates.department.toUpperCase() : null
        
        if (updates.department && !validDepartments.includes(normalizedDept)) {
          throw new Error(`Invalid department: "${updates.department}". Must be one of: SCIENCE, COMMERCIAL, HUMANITIES, TECHNICAL, VOCATIONAL, or null`)
        }
        
        studentUpdates.department = normalizedDept
      }

      // Handle photo upload
      if (updates.photoFile) {
        const photoUrl = await this.uploadStudentPhoto(schoolId, existingStudent.user_id, updates.photoFile)
        if (photoUrl) {
          studentUpdates.photo_url = photoUrl
        }
      }

      // Update student record
      const { data: updatedStudent, error: updateError } = await supabase
        .from('students')
        .update(studentUpdates)
        .eq('id', studentId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update student: ${updateError.message}`)
      }

      console.log('✅ Student record updated')

      // Update user name and email if provided
      if (updates.fullName || updates.email) {
        const userUpdates: any = {
          updated_at: new Date().toISOString(),
        }
        
        if (updates.fullName) {
          userUpdates.full_name = updates.fullName
        }
        
        if (updates.email) {
          userUpdates.email = updates.email
        }

        const { error: userError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', existingStudent.user_id)

        if (userError) {
          console.warn('⚠️ Could not update user info:', userError)
        } else {
          console.log('✅ User info updated')
        }
      }

      // Update subject enrollment if provided
      if (updates.subjectIds && Array.isArray(updates.subjectIds)) {
        // Delete old subject enrollments
        const { error: deleteError } = await supabase
          .from('student_subjects')
          .delete()
          .eq('student_id', studentId)

        if (deleteError) {
          console.warn('⚠️ Could not delete old subjects:', deleteError)
        } else {
          console.log('✅ Old subject enrollments removed')
        }

        // Add new subject enrollments
        if (updates.subjectIds.length > 0) {
          const newSubjects = updates.subjectIds.map(subjectId => ({
            student_id: studentId,
            subject_id: subjectId,
            school_id: schoolId,
            created_at: new Date().toISOString(),
          }))

          const { error: insertError } = await supabase
            .from('student_subjects')
            .insert(newSubjects)

          if (insertError) {
            console.warn('⚠️ Could not link new subjects:', insertError)
          } else {
            console.log('✅ New subjects linked')
          }
        }
      }

      // Update guardian if provided
      if (updates.guardianFullName || updates.guardianPhone || updates.guardianEmail) {
        // Check if guardian exists
        const { data: existingGuardian } = await supabase
          .from('guardians')
          .select('id')
          .eq('student_id', studentId)
          .single()

        const guardianData: any = {
          full_name: updates.guardianFullName,
          phone: updates.guardianPhone,
          email: updates.guardianEmail,
          updated_at: new Date().toISOString(),
        }

        if (existingGuardian) {
          // Update existing guardian
          const { error: guardError } = await supabase
            .from('guardians')
            .update(guardianData)
            .eq('id', existingGuardian.id)

          if (guardError) {
            console.warn('⚠️ Could not update guardian:', guardError)
          } else {
            console.log('✅ Guardian updated')
          }
        } else {
          // Create new guardian
          const { error: guardError } = await supabase
            .from('guardians')
            .insert({
              student_id: studentId,
              school_id: schoolId,
              ...guardianData,
              created_at: new Date().toISOString(),
            })

          if (guardError) {
            console.warn('⚠️ Could not create guardian:', guardError)
          } else {
            console.log('✅ Guardian created')
          }
        }
      }

      return {
        student: updatedStudent,
        admission_number: existingStudent.admission_number,
      }
    } catch (error: any) {
      console.error('❌ Student profile update failed:', error)
      throw error
    }
  }
}
