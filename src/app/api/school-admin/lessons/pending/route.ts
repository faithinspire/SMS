import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/school-admin/lessons/pending
 *
 * Fetches all pending lesson notes that require school admin approval/review
 * Visible to: SCHOOL_ADMIN, HEADMASTER, HEADTEACHER
 *
 * Query Parameters:
 * - school_id (required): The school ID
 * - admin_id (required): The admin/headmaster/headteacher ID making the request
 * - status (optional): Filter by status (SUBMITTED, UNDER_REVIEW, RETURNED, APPROVED)
 *
 * Returns: Array of lesson notes with teacher, subject, and class information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const adminId = searchParams.get('admin_id')
    const statusFilter = searchParams.get('status')

    if (!schoolId || !adminId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, admin_id' },
        { status: 400 }
      )
    }

    // Verify the admin exists and belongs to this school
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, school_id, role')
      .eq('id', adminId)
      .eq('school_id', schoolId)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin user not found or does not belong to this school' },
        { status: 403 }
      )
    }

    // Verify admin has appropriate role
    const allowedRoles = ['SCHOOL_ADMIN', 'HEADMASTER', 'HEADTEACHER', 'PRINCIPAL']
    if (!allowedRoles.includes(adminUser.role)) {
      return NextResponse.json(
        { error: `Unauthorized: Role ${adminUser.role} cannot access lesson notes` },
        { status: 403 }
      )
    }

    // Get all lesson notes - filter by status if provided
    let query = supabase
      .from('lesson_notes')
      .select('*')
      .eq('school_id', schoolId)

    // Filter by status if provided, otherwise show all non-rejected status
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    } else {
      query = query.in('status', ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED'])
    }

    const { data: lessonNotes, error: notesError } = await query.order('created_at', { ascending: false })

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

    // Get unique subject IDs, class_arm_combo IDs, and teacher IDs
    const subjectIds = [...new Set(lessonNotes.map((n: any) => n.subject_id).filter(Boolean))]
    const classArmIds = [...new Set(lessonNotes.map((n: any) => n.class_arm_combo_id).filter(Boolean))]
    const teacherIds = [...new Set(lessonNotes.map((n: any) => n.teacher_id).filter(Boolean))]

    // Fetch related data in parallel
    const [subjectsResult, classArmsResult, teachersResult] = await Promise.all([
      subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, code').in('id', subjectIds)
        : Promise.resolve({ data: [] }),
      classArmIds.length > 0
        ? supabase
            .from('class_arm_combos')
            .select('id, class_id, arm_id')
            .in('id', classArmIds)
        : Promise.resolve({ data: [] }),
      teacherIds.length > 0
        ? supabase.from('users').select('id, full_name, email').in('id', teacherIds)
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
    const teacherMap = new Map((teachersResult.data || []).map((u: any) => [u.id, u]))
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
      const teacher = teacherMap.get(note.teacher_id)

      return {
        id: note.id,
        topic: note.topic,
        content_summary: note.content_summary,
        learning_objectives: note.learning_objectives,
        file_path: note.file_path,
        file_name: note.file_name,
        file_size: note.file_size,
        status: note.status,
        lesson_date: note.lesson_date,
        submitted_at: note.submitted_at,
        reviewed_at: note.reviewed_at,
        reviewer_feedback: note.reviewer_feedback,
        teacher: {
          id: note.teacher_id,
          full_name: teacher?.full_name || note.teacher_name || 'Unknown',
          email: teacher?.email || '',
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
    console.error('Error in GET /api/school-admin/lessons/pending:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
