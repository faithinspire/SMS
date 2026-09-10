/**
 * Teacher Photo Upload Service
 * Uses backend API to bypass RLS on Supabase Storage
 */

export class TeacherPhotoService {
  /**
   * Upload teacher photo via backend endpoint
   * This bypasses RLS by using service role key
   */
  static async uploadTeacherPhoto(
    schoolId: string,
    teacherId: string,
    photoFile: File
  ): Promise<string | null> {
    try {
      const timestamp = Date.now()
      console.log(`📤 Uploading teacher photo for ${teacherId}...`)

      // Create form data
      const formData = new FormData()
      formData.append('file', photoFile)
      formData.append('schoolId', schoolId)
      formData.append('teacherId', teacherId)

      // Upload via backend endpoint (bypasses RLS)
      const response = await fetch('/api/upload/teacher-photo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Photo upload failed:', errorData)
        return null
      }

      const result = await response.json()

      console.log('✅ Photo uploaded successfully')
      console.log('✅ Photo URL:', result.url)

      return result.url
    } catch (error: any) {
      console.warn('⚠️ Photo upload failed:', error.message)
      console.warn('   Teacher registration will continue without photo')
      return null
    }
  }
}
