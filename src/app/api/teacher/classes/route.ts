import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/teacher/classes
 * Fetch all classes assigned to a teacher
 * 
 * HEADERS:
 * - x-teacher-id: UUID (teacher/user id)
 * - x-school-id: UUID (school id)
 * 
 * RETURNS:
 * - Array of class_arm_combos with class and arm details
 */
export async function GET(request: NextRequest) {
  try {
    const teacherId = request.headers.get('x-teacher-id')
    const schoolId = request.headers.get('x-school-id')

    console.log('[API] GET /api/teacher/classes - teacherId:', teacherId, 'schoolId:', schoolId)

    if (!teacherId || !schoolId) {
      return NextResponse.json(
        { error: 'Missing required headers: x-teacher-id, x-school-id' },
        { status: 400 }
      )
    }

    // Get classes where teacher is class teacher with nested relation selects
    console.log('[API] Fetching managedClasses...')
    
    const { data: managedClasses, error: classError } = await supabase
      .from('class_arm_combos')
      .select(
        `
        id,
        class_id,
        arm_id,
        classes (id, name, level, type),
        arms (id, name)
      `
      )
      .eq('class_teacher_id', teacherId)
      .eq('school_id', schoolId)

    if (classError) {
      console.error('[API] Class teacher query error:', classError)
      throw new Error(`Class teacher query failed: ${classError.message}`)
    }

    console.log('[API] managedClasses result:', managedClasses)

    if (!managedClasses || managedClasses.length === 0) {
      console.log('[API] No classes found, returning empty array')
      return NextResponse.json({
        success: true,
        count: 0,
        classes: [],
        message: 'No classes assigned to this teacher',
      })
    }

    // Return the data as-is from Supabase (includes nested relations)
    console.log('[API] Successfully returning', managedClasses.length, 'classes')

    return NextResponse.json({
      success: true,
      count: managedClasses.length,
      classes: managedClasses,
    })
  } catch (error: any) {
    console.error('[API] ERROR in GET /api/teacher/classes:', error)
    console.error('[API] Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.details },
      { status: 500 }
    )
  }
}
