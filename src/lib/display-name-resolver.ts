/**
 * Display Name Resolver Service
 * Converts UUIDs to human-readable display names
 * Caches results to minimize database queries
 */

import { createClient } from '@/lib/supabase-client'

const supabase = createClient()

// Simple in-memory cache for display names
const displayNameCache = new Map<string, string>()

export class DisplayNameResolver {
  /**
   * Resolve subject UUID to display name
   * Format: "SS1 SCIENCE" or "Mathematics"
   */
  static async getSubjectDisplayName(subjectId: string | undefined | null): Promise<string> {
    if (!subjectId) return '(No Subject)'

    // Check cache first
    const cacheKey = `subject_${subjectId}`
    if (displayNameCache.has(cacheKey)) {
      return displayNameCache.get(cacheKey)!
    }

    try {
      // Handle fallback nigerian subjects (prefixed with "nigerian-")
      if (subjectId.startsWith('nigerian-')) {
        const code = subjectId.replace('nigerian-', '').toUpperCase()
        return code
      }

      const { data, error } = await supabase
        .from('subjects')
        .select('name, code')
        .eq('id', subjectId)
        .single()

      if (error || !data) {
        console.warn(`⚠️ Subject not found: ${subjectId}`)
        return subjectId.slice(0, 8) // Fallback: first 8 chars of UUID
      }

      const displayName = data.name || data.code || subjectId
      displayNameCache.set(cacheKey, displayName)
      return displayName
    } catch (err) {
      console.error('Error resolving subject name:', err)
      return subjectId.slice(0, 8)
    }
  }

  /**
   * Resolve class UUID to display name
   * Format: "SS1 SCIENCE" or "Primary 1 - Arm A"
   */
  static async getClassDisplayName(classId: string | undefined | null): Promise<string> {
    if (!classId) return '(No Class)'

    // Check cache first
    const cacheKey = `class_${classId}`
    if (displayNameCache.has(cacheKey)) {
      return displayNameCache.get(cacheKey)!
    }

    try {
      // Handle fallback nigerian classes
      if (classId.startsWith('nigerian-')) {
        const level = classId.replace('nigerian-', '')
        // Map level number to class name (simplified)
        const levelMap: Record<string, string> = {
          '14': 'SS1', '15': 'SS2', '16': 'SS3',
          '11': 'JSS1', '12': 'JSS2', '13': 'JSS3',
          '5': 'Primary1', '6': 'Primary2', '7': 'Primary3',
          '8': 'Primary4', '9': 'Primary5', '10': 'Primary6',
        }
        return levelMap[level] || `Class ${level}`
      }

      const { data, error } = await supabase
        .from('classes')
        .select('name, level')
        .eq('id', classId)
        .single()

      if (error || !data) {
        console.warn(`⚠️ Class not found: ${classId}`)
        return classId.slice(0, 8)
      }

      const displayName = data.name || `Class L${data.level}` || classId
      displayNameCache.set(cacheKey, displayName)
      return displayName
    } catch (err) {
      console.error('Error resolving class name:', err)
      return classId.slice(0, 8)
    }
  }

  /**
   * Resolve class-arm combo UUID to display name
   * Format: "SS1 - Arm A" or "Primary 1 - Arm B"
   */
  static async getClassArmComboDisplayName(comboId: string | undefined | null): Promise<string> {
    if (!comboId) return '(No Class)'

    // Check cache first
    const cacheKey = `combo_${comboId}`
    if (displayNameCache.has(cacheKey)) {
      return displayNameCache.get(cacheKey)!
    }

    try {
      // Handle fallback nigerian combos
      if (comboId.startsWith('nigerian-combo-')) {
        // Format is nigerian-combo-{classIdx}-{armIdx}
        // Just return a placeholder as we don't have full data
        return `Class - Arm`
      }

      const { data, error } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes (name),
          arms (name)
        `)
        .eq('id', comboId)
        .single()

      if (error || !data) {
        console.warn(`⚠️ Class-arm combo not found: ${comboId}`)
        return comboId.slice(0, 8)
      }

      const className = (data.classes as any)?.name || 'Unknown Class'
      const armName = (data.arms as any)?.name || 'Unknown'
      const displayName = `${className} - Arm ${armName}`
      displayNameCache.set(cacheKey, displayName)
      return displayName
    } catch (err) {
      console.error('Error resolving class-arm combo name:', err)
      return comboId.slice(0, 8)
    }
  }

  /**
   * Resolve student UUID to display name
   * Format: "John Doe" or full name
   */
  static async getStudentDisplayName(studentId: string | undefined | null): Promise<string> {
    if (!studentId) return '(No Student)'

    // Check cache first
    const cacheKey = `student_${studentId}`
    if (displayNameCache.has(cacheKey)) {
      return displayNameCache.get(cacheKey)!
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('full_name')
        .eq('id', studentId)
        .single()

      if (error || !data) {
        console.warn(`⚠️ Student not found: ${studentId}`)
        return studentId.slice(0, 8)
      }

      const displayName = data.full_name || studentId
      displayNameCache.set(cacheKey, displayName)
      return displayName
    } catch (err) {
      console.error('Error resolving student name:', err)
      return studentId.slice(0, 8)
    }
  }

  /**
   * Resolve teacher UUID to display name
   * Format: "Mr. John Doe" or full name
   */
  static async getTeacherDisplayName(teacherId: string | undefined | null): Promise<string> {
    if (!teacherId) return '(No Teacher)'

    // Check cache first
    const cacheKey = `teacher_${teacherId}`
    if (displayNameCache.has(cacheKey)) {
      return displayNameCache.get(cacheKey)!
    }

    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('first_name, last_name')
        .eq('id', teacherId)
        .single()

      if (error || !data) {
        console.warn(`⚠️ Teacher not found: ${teacherId}`)
        return teacherId.slice(0, 8)
      }

      const displayName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || teacherId
      displayNameCache.set(cacheKey, displayName)
      return displayName
    } catch (err) {
      console.error('Error resolving teacher name:', err)
      return teacherId.slice(0, 8)
    }
  }

  /**
   * Resolve stream UUID to display name
   * Format: "Science" or "Commercial"
   */
  static async getStreamDisplayName(streamId: string | undefined | null): Promise<string> {
    if (!streamId) return '(No Stream)'

    // Check cache first
    const cacheKey = `stream_${streamId}`
    if (displayNameCache.has(cacheKey)) {
      return displayNameCache.get(cacheKey)!
    }

    try {
      const { data, error } = await supabase
        .from('streams')
        .select('name')
        .eq('id', streamId)
        .single()

      if (error || !data) {
        console.warn(`⚠️ Stream not found: ${streamId}`)
        return streamId.slice(0, 8)
      }

      const displayName = data.name || streamId
      displayNameCache.set(cacheKey, displayName)
      return displayName
    } catch (err) {
      console.error('Error resolving stream name:', err)
      return streamId.slice(0, 8)
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    displayNameCache.clear()
  }

  /**
   * Batch resolve multiple subjects with caching
   */
  static async getMultipleSubjectDisplayNames(
    subjectIds: (string | undefined | null)[]
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {}

    for (const id of subjectIds) {
      if (id) {
        result[id] = await this.getSubjectDisplayName(id)
      }
    }

    return result
  }

  /**
   * Format a list of subjects for display
   */
  static async formatSubjectList(subjectIds: (string | undefined | null)[]): Promise<string> {
    const names = await Promise.all(
      subjectIds.map(id => this.getSubjectDisplayName(id))
    )
    return names.filter(n => n !== '(No Subject)').join(', ')
  }
}

export default DisplayNameResolver
