import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/principal/lessons/pending
 * Get all pending lesson notes for principal review
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - principal_id: UUID (required - for authorization)
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   count: number,
 *   lesson_notes: Array<{
 *     id: UUID,
 *     title: string,
 *     status: string,
 *     teacher: {id, full_name, email},
 *     subject: {id, name, code},
 *     class_arm: {class_name, arm_name},
 *     created_at: timestamp,
 *     content: string,
 *     attachments: array
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const principalId = searchParams.get('principal_id')

    if (!schoolId || !principalId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, principal_id' },
        { status: 400 }
      )
    }

    // Get all lesson notes with status SUBMITTED, UNDER_REVIEW, or RETURNED
    const { data: lessonNotes, error: notesError } = await supabase
      .from('lesson_notes')
      .select('*')
      .eq('school_id', schoolId)
      .in('status', ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED'])
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Error fetching lesson notes:', notesError)
      return NextResponse.json(
        { error: 'Failed to fetch lesson notes', details: notesError.message },
        { status: 500 }
      )
    }

    if (!lessonNotes || lessonNotes.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        lesson_notes: [],
      })
    }

    // Get unique subject IDs, class_arm_combo IDs, and created_by IDs
    const subjectIds = [...new Set(lessonNotes.map((n: any) => n.subject_id).filter(Boolean))]
    const classArmIds = [...new Set(lessonNotes.map((n: any) => n.class_arm_combo_id).filter(Boolean))]
    const userIds = [...new Set(lessonNotes.map((n: any) => n.created_by).filter(Boolean))]

    // Fetch related data in parallel
    const [subjectsResult, classArmsResult, usersResult] = await Promise.all([
      subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, code').in('id', subjectIds)
        : Promise.resolve({ data: [] }),
      classArmIds.length > 0
        ? supabase
            .from('class_arm_combos')
            .select('id, class_id, arm_id')
            .in('id', classArmIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from('users').select('id, full_name, email').in('id', userIds)
        : Promise.resolve({ data: [] }),
    ])

    // Get class and arm names if needed
    let classesData: any[] = []
    let armsData: any[] = []

    if (classArmsResult.data && classArmsResult.data.length > 0) {
      const classIds = [...new Set(classArmsResult.data.map((ca: any) => ca.class_id).filter(Boolean))]
      const armIds = [...new Set(classArmsResult.data.map((ca: any) => ca.arm_id).filter(Boolean))]

      if (classIds.length > 0) {
        const classRes = await supabase.from('classes').select('id, name').in('id', classIds)
        classesData = classRes.data || []
      }

      if (armIds.length > 0) {
        const armRes = await supabase.from('arms').select('id, name').in('id', armIds)
        armsData = armRes.data || []
      }
    }

    // Build lookup maps
    const subjectMap = new Map((subjectsResult.data || []).map((s: any) => [s.id, s]))
    const userMap = new Map((usersResult.data || []).map((u: any) => [u.id, u]))
    const classMap = new Map(classesData.map((c: any) => [c.id, c]))
    const armMap = new Map(armsData.map((a: any) => [a.id, a]))
    const classArmMap = new Map(
      (classArmsResult.data || []).map((ca: any) => [
        ca.id,
        {
          classId: ca.class_id,
          armId: ca.arm_id,
        },
      ])
    )

    // Format response
    const formattedNotes = lessonNotes.map((note: any) => {
      const classArm = classArmMap.get(note.class_arm_combo_id)
      const classData = classArm ? classMap.get(classArm.classId) : null
      const armData = classArm ? armMap.get(classArm.armId) : null
      const subject = subjectMap.get(note.subject_id)
      const user = userMap.get(note.created_by)

      return {
        id: note.id,
        title: note.title,
        content: note.content,
        attachments: note.attachments,
        status: note.status,
        created_at: note.created_at,
        teacher: {
          id: note.created_by,
          full_name: user?.full_name || 'Unknown',
          email: user?.email || '',
        },
        subject: {
          id: note.subject_id,
          name: subject?.name || 'Unknown',
          code: subject?.code || '',
        },
        class_arm: {
          class_name: classData?.name || 'Unknown',
          arm_name: armData?.name || '',
        },
      }
    })

    return NextResponse.json({
      success: true,
      count: formattedNotes.length,
      lesson_notes: formattedNotes,
    })
  } catch (error) {
    console.error('Error in GET /api/principal/lessons/pending:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
