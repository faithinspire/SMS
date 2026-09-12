/**
 * GET /api/results/get
 * Get student or class results
 * Query params:
 *   - type: 'student' | 'class' | 'transcript'
 *   - studentId or classArmComboId (depending on type)
 *   - termId (required for student/class)
 *   - subjectId (optional, for filtering)
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { ResultsService } from '@/services/results.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 })
    }

    // Parse query params
    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'student'
    const studentId = url.searchParams.get('studentId')
    const classArmComboId = url.searchParams.get('classArmComboId')
    const termId = url.searchParams.get('termId')
    const subjectId = url.searchParams.get('subjectId')

    // Route to appropriate handler
    switch (type) {
      case 'student':
        if (!studentId || !termId) {
          return NextResponse.json(
            { error: 'Missing required params: studentId, termId' },
            { status: 400 }
          )
        }
        const studentResults = await ResultsService.getStudentTermResults(
          studentId,
          termId,
          user.school_id
        )
        return NextResponse.json(studentResults, { status: 200 })

      case 'class':
        if (!classArmComboId || !termId) {
          return NextResponse.json(
            { error: 'Missing required params: classArmComboId, termId' },
            { status: 400 }
          )
        }
        // Verify user is teacher of this class
        if (user.role === 'TEACHER') {
          const { data: isTeacher } = await supabase
            .from('class_arm_combos')
            .select('id')
            .eq('class_teacher_id', session.user.id)
            .eq('id', classArmComboId)
            .single()

          if (!isTeacher) {
            return NextResponse.json(
              { error: 'Unauthorized: Not teacher of this class' },
              { status: 403 }
            )
          }
        }
        const classResults = await ResultsService.getClassResults(
          classArmComboId,
          termId,
          user.school_id,
          subjectId || undefined
        )
        return NextResponse.json(classResults, { status: 200 })

      case 'transcript':
        if (!studentId) {
          return NextResponse.json(
            { error: 'Missing required param: studentId' },
            { status: 400 }
          )
        }
        // Student can only see own transcript
        if (user.role === 'STUDENT') {
          const { data: ownStudent } = await supabase
            .from('students')
            .select('user_id')
            .eq('id', studentId)
            .single()

          if (ownStudent?.user_id !== session.user.id) {
            return NextResponse.json(
              { error: 'Unauthorized: Cannot view other student transcripts' },
              { status: 403 }
            )
          }
        }
        const transcript = await ResultsService.getStudentTranscript(studentId, user.school_id)
        return NextResponse.json(transcript, { status: 200 })

      case 'statistics':
        if (!classArmComboId || !termId) {
          return NextResponse.json(
            { error: 'Missing required params: classArmComboId, termId' },
            { status: 400 }
          )
        }
        const stats = await ResultsService.getClassStatistics(
          classArmComboId,
          termId,
          user.school_id,
          subjectId || undefined
        )
        return NextResponse.json(stats, { status: 200 })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('❌ Exception in results API:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
