import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * POST /api/admin/populate-teacher-subjects
 * 
 * Admin endpoint to populate subject_teacher_assignments for all teachers
 * at a specific school (or all schools).
 * 
 * This ensures teachers have proper subject assignments based on their
 * class levels.
 */
export async function POST(request: NextRequest) {
  try {
    const { school_id, school_name } = await request.json()

    if (!school_id && !school_name) {
      return NextResponse.json(
        { error: 'Provide either school_id or school_name' },
        { status: 400 }
      )
    }

    let targetSchoolId = school_id

    // If only name provided, find the school
    if (!targetSchoolId && school_name) {
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .ilike('name', `%${school_name}%`)
        .single()

      if (schoolError || !schoolData) {
        return NextResponse.json(
          { error: `School not found: ${school_name}` },
          { status: 404 }
        )
      }

      targetSchoolId = schoolData.id
    }

    console.log(`[Populate Teachers] Processing school: ${targetSchoolId}`)

    // STEP 1: Get all class teachers at this school
    const { data: classTeachers, error: classTeacherError } = await supabase
      .from('class_arm_combos')
      .select(
        `
        class_teacher_id,
        id as class_arm_combo_id,
        class_id,
        arm_id,
        school_id,
        classes (
          id,
          name,
          level
        )
      `
      )
      .eq('school_id', targetSchoolId)
      .not('class_teacher_id', 'is', null)

    if (classTeacherError) throw classTeacherError

    if (!classTeachers || classTeachers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No class teachers found at this school',
        stats: {
          teachers: 0,
          assignments_created: 0,
          assignments_skipped: 0,
        },
      })
    }

    console.log(`[Populate Teachers] Found ${classTeachers.length} class assignments`)

    let totalAssignmentsCreated = 0
    let totalAssignmentsSkipped = 0

    // STEP 2: For each class teacher, get applicable subjects and create assignments
    for (const ct of classTeachers) {
      if (!ct.class_teacher_id || !ct.classes?.level) {
        console.log(`[Populate Teachers] Skipping: missing teacher or class level`)
        totalAssignmentsSkipped++
        continue
      }

      // Get all subjects applicable to this class level
      const { data: applicableSubjects, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, code')
        .ilike('applicable_to', `%${ct.classes.level}%`)

      if (subjectError) {
        console.error(`[Populate Teachers] Error fetching subjects for level ${ct.classes.level}:`, subjectError)
        totalAssignmentsSkipped++
        continue
      }

      if (!applicableSubjects || applicableSubjects.length === 0) {
        console.log(`[Populate Teachers] No subjects for level: ${ct.classes.level}`)
        totalAssignmentsSkipped++
        continue
      }

      console.log(
        `[Populate Teachers] Creating ${applicableSubjects.length} assignments for teacher ${ct.class_teacher_id} in class ${ct.classes.name}`
      )

      // Create assignments for each subject
      const assignments = applicableSubjects.map((subject) => ({
        teacher_id: ct.class_teacher_id,
        subject_id: subject.id,
        class_arm_combo_id: ct.class_arm_combo_id,
        school_id: targetSchoolId,
        assigned_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabase
        .from('subject_teacher_assignments')
        .insert(assignments)
        .on('*', (payload) => {
          console.log('[Populate Teachers] Inserted:', payload)
        })

      if (insertError) {
        // Check if it's a duplicate conflict (which is okay)
        if (insertError.message?.includes('duplicate')) {
          console.log(`[Populate Teachers] Duplicate assignments (skipped):`, insertError.message)
          totalAssignmentsSkipped += assignments.length
        } else {
          console.error(`[Populate Teachers] Insert error:`, insertError)
          totalAssignmentsSkipped += assignments.length
        }
      } else {
        totalAssignmentsCreated += assignments.length
      }
    }

    // STEP 3: Get summary stats
    const { data: stats } = await supabase
      .rpc('exec', {
        query: `
          SELECT 
            COUNT(*) as total_assignments,
            COUNT(DISTINCT teacher_id) as teachers_with_assignments,
            COUNT(DISTINCT subject_id) as unique_subjects
          FROM subject_teacher_assignments
          WHERE school_id = '${targetSchoolId}'
        `,
      })
      .catch(() => ({ data: null }))

    // Alternative: Query directly
    const { count: totalCount } = await supabase
      .from('subject_teacher_assignments')
      .select('*', { count: 'exact' })
      .eq('school_id', targetSchoolId)

    return NextResponse.json({
      success: true,
      message: 'Subject assignments populated',
      stats: {
        teachers_processed: classTeachers.length,
        assignments_created: totalAssignmentsCreated,
        assignments_skipped: totalAssignmentsSkipped,
        total_assignments_in_school: totalCount || 0,
      },
    })
  } catch (error) {
    console.error('[Populate Teachers] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to populate teacher subjects',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

