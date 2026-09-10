import { supabase } from '@/lib/supabase-client'

/**
 * Get human-readable information from UUIDs
 * Caches results to avoid repeated queries
 */

const idCache = new Map<string, { type: string; name: string }>()

/**
 * Format a subject UUID to subject name
 */
export async function getSubjectName(subjectId: string, schoolId: string): Promise<string> {
  const cacheKey = `subject-${subjectId}`
  if (idCache.has(cacheKey)) {
    return idCache.get(cacheKey)?.name || 'N/A'
  }

  try {
    const { data } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subjectId)
      .eq('school_id', schoolId)
      .single()

    const name = data?.name || 'Unknown Subject'
    idCache.set(cacheKey, { type: 'subject', name })
    return name
  } catch (error) {
    console.error('Error fetching subject name:', error)
    return 'Unknown Subject'
  }
}

/**
 * Format a class UUID to class + arm name
 */
export async function getClassArmName(classArmComboId: string, schoolId: string): Promise<string> {
  const cacheKey = `class-${classArmComboId}`
  if (idCache.has(cacheKey)) {
    return idCache.get(cacheKey)?.name || 'N/A'
  }

  try {
    const { data } = await supabase
      .from('class_arm_combos')
      .select(
        `
        classes (name),
        arms (name)
      `
      )
      .eq('id', classArmComboId)
      .eq('school_id', schoolId)
      .single()

    const className = (data?.classes as any)?.name || 'Class'
    const armName = (data?.arms as any)?.name || 'Arm'
    const name = `${className}${armName ? ` - ${armName}` : ''}`
    idCache.set(cacheKey, { type: 'class', name })
    return name
  } catch (error) {
    console.error('Error fetching class/arm name:', error)
    return 'Unknown Class'
  }
}

/**
 * Format a user/teacher UUID to full name
 */
export async function getUserName(userId: string, schoolId: string): Promise<string> {
  const cacheKey = `user-${userId}`
  if (idCache.has(cacheKey)) {
    return idCache.get(cacheKey)?.name || 'N/A'
  }

  try {
    const { data } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .eq('school_id', schoolId)
      .single()

    const name = data?.full_name || 'Unknown User'
    idCache.set(cacheKey, { type: 'user', name })
    return name
  } catch (error) {
    console.error('Error fetching user name:', error)
    return 'Unknown User'
  }
}

/**
 * Format a term UUID to term name
 */
export async function getTermName(termId: string, schoolId: string): Promise<string> {
  const cacheKey = `term-${termId}`
  if (idCache.has(cacheKey)) {
    return idCache.get(cacheKey)?.name || 'N/A'
  }

  try {
    const { data } = await supabase
      .from('academic_terms')
      .select('term_name')
      .eq('id', termId)
      .eq('school_id', schoolId)
      .single()

    const name = data?.term_name || 'Unknown Term'
    idCache.set(cacheKey, { type: 'term', name })
    return name
  } catch (error) {
    console.error('Error fetching academic term name:', error)
    return 'Unknown Term'
  }
}

/**
 * Clear the ID cache (useful for testing)
 */
export function clearIdCache() {
  idCache.clear()
}

/**
 * Batch fetch multiple IDs at once for performance
 */
export async function batchFetchNames(
  ids: Array<{ id: string; type: 'subject' | 'class' | 'user' | 'term' }>,
  schoolId: string
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  for (const item of ids) {
    if (item.type === 'subject') {
      results[item.id] = await getSubjectName(item.id, schoolId)
    } else if (item.type === 'class') {
      results[item.id] = await getClassArmName(item.id, schoolId)
    } else if (item.type === 'user') {
      results[item.id] = await getUserName(item.id, schoolId)
    } else if (item.type === 'term') {
      results[item.id] = await getTermName(item.id, schoolId)
    }
  }

  return results
}
