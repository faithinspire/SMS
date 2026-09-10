import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/principal/dashboard
 * Get aggregated dashboard data for principal
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - principal_id: UUID (required - for authorization)
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   dashboard: {
 *     school_info: {name, logo_url, type},
 *     stats: {
 *       total_classes: number,
 *       total_students: number,
 *       total_teachers: number,
 *       total_staff: number,
 *       average_attendance: percentage,
 *       pending_lesson_notes: number
 *     },
 *     classes: Array<{
 *       id, name, level, arm_name, teacher_name,
 *       student_count, average_score, attendance_rate
 *     }>,
 *     recent_scores: Array<{
 *       student_name, subject, score, grade, term
 *     }>,
 *     attendance_summary: {
 *       present: number,
 *       absent: number,
 *       late: number
 *     },
 *     recent_activity: Array<{
 *       type, description, timestamp
 *     }>
 *   }
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

    // Step 1: Get school info
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, logo_url, type')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      console.error('Error fetching school:', schoolError)
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Step 2: Get classes
    const { data: classes, error: classesError } = await supabase
      .from('class_arm_combos')
      .select(
        `
        id,
        class_arm_combo_id: id,
        classes (id, name, level),
        arms (name),
        class_teacher_id,
        users (full_name)
      `
      )
      .eq('school_id', schoolId)
      .order('classes.level', { ascending: true })

    if (classesError) {
      console.error('Error fetching classes:', classesError)
    }

    // Step 3: Get total students
    const { count: totalStudents, error: studentCountError } = await supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)

    // Step 4: Get total staff
    const { count: totalStaff, error: staffCountError } = await supabase
      .from('staff')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)

    // Step 5: Get total teachers
    const { count: totalTeachers, error: teacherCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('role', 'TEACHER')

    // Step 6: Get pending lesson notes
    const { count: pendingLessons, error: lessonCountError } = await supabase
      .from('lesson_notes')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .in('status', ['SUBMITTED', 'UNDER_REVIEW'])

    // Step 7: Get recent scores
    const { data: recentScores, error: scoresError } = await supabase
      .from('score_sheets')
      .select(
        `
        id,
        total,
        grade,
        term_id,
        student_id,
        subject_id,
        students (users (full_name)),
        subjects (name),
        academic_terms (term_name)
      `
      )
      .eq('school_id', schoolId)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (scoresError) {
      console.error('Error fetching scores:', scoresError)
    }

    // Step 8: Get today's attendance
    const today = new Date().toISOString().split('T')[0]
    const { data: todayAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('status')
      .eq('school_id', schoolId)
      .eq('date', today)

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
    }

    // Format response
    const attendanceSummary = {
      present: (todayAttendance || []).filter((a: any) => a.status === 'PRESENT').length,
      absent: (todayAttendance || []).filter((a: any) => a.status === 'ABSENT').length,
      late: (todayAttendance || []).filter((a: any) => a.status === 'LATE').length,
    }

    const classData = (classes || []).map((c: any) => ({
      id: c.class_arm_combo_id,
      name: `${c.classes?.name || 'Unknown'} ${c.arms?.name || ''}`,
      level: c.classes?.level || 0,
      arm_name: c.arms?.name || '',
      teacher_name: c.users?.full_name || 'Unassigned',
      student_count: 0, // Would need separate query for per-class count
      average_score: 0, // Would need calculation
      attendance_rate: 0, // Would need calculation
    }))

    const recentScoreData = (recentScores || []).map((s: any) => ({
      student_name: s.students?.[0]?.users?.full_name || 'Unknown',
      subject: s.subjects?.name || 'Unknown',
      score: s.total || 0,
      grade: s.grade || '-',
      term: s.academic_terms?.term_name || 'Unknown',
    }))

    const dashboard = {
      school_info: {
        name: school.name,
        logo_url: school.logo_url,
        type: school.type,
      },

      stats: {
        total_classes: classes?.length || 0,
        total_students: totalStudents || 0,
        total_teachers: totalTeachers || 0,
        total_staff: totalStaff || 0,
        average_attendance: Math.round(
          ((attendanceSummary.present /
            (attendanceSummary.present + attendanceSummary.absent + attendanceSummary.late)) *
            100) ||
            0
        ),
        pending_lesson_notes: pendingLessons || 0,
      },

      classes: classData,
      recent_scores: recentScoreData,
      attendance_summary: attendanceSummary,

      recent_activity: [
        {
          type: 'LESSON_NOTE',
          description: `${pendingLessons || 0} pending lesson notes for review`,
          timestamp: new Date().toISOString(),
        },
        {
          type: 'ATTENDANCE',
          description: `${attendanceSummary.present} students present today`,
          timestamp: new Date().toISOString(),
        },
      ],
    }

    return NextResponse.json({
      success: true,
      dashboard,
    })
  } catch (error) {
    console.error('Error in GET /api/principal/dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
