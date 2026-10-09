/**
 * School Admin - Student Registration Dropdown Data API
 * 
 * Provides sessions, terms, classes, and arms for student registration form
 * 
 * Query params:
 * - schoolId: required
 * - dataType: optional (sessions | terms | classes | arms | all) - default: all
 * - classId: optional (required when fetching arms)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId')
    const dataType = request.nextUrl.searchParams.get('dataType') || 'all'
    const classId = request.nextUrl.searchParams.get('classId')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log(`[Dropdown Data API] Fetching ${dataType} for school:`, schoolId)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const result: any = {}

    // Fetch sessions
    if (dataType === 'all' || dataType === 'sessions') {
      const { data: sessions, error: sessionsError } = await supabase
        .from('academic_sessions')
        .select('id, session_year, start_year, end_year, is_active')
        .eq('school_id', schoolId)
        .order('start_year', { ascending: false })

      if (sessionsError) {
        console.error('[Dropdown Data API] Error fetching sessions:', sessionsError.message)
      } else {
        result.sessions = sessions || []
        console.log(`[Dropdown Data API] ✅ Fetched ${sessions?.length || 0} sessions`)
      }
    }

    // Fetch terms
    if (dataType === 'all' || dataType === 'terms') {
      const { data: terms, error: termsError } = await supabase
        .from('academic_terms')
        .select('id, session_id, term_number, name, is_active')
        .eq('school_id', schoolId)
        .order('term_number', { ascending: true })

      if (termsError) {
        console.error('[Dropdown Data API] Error fetching terms:', termsError.message)
      } else {
        result.terms = terms || []
        console.log(`[Dropdown Data API] ✅ Fetched ${terms?.length || 0} terms`)
      }
    }

    // Fetch classes
    if (dataType === 'all' || dataType === 'classes') {
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name, level, type')
        .eq('school_id', schoolId)
        .order('level', { ascending: true })

      if (classesError) {
        console.error('[Dropdown Data API] Error fetching classes:', classesError.message)
      } else {
        result.classes = classes || []
        console.log(`[Dropdown Data API] ✅ Fetched ${classes?.length || 0} classes`)
      }
    }

    // Fetch arms
    if (dataType === 'all' || dataType === 'arms') {
      let query = supabase
        .from('class_arms')
        .select('id, class_id, arm_name')

      if (classId) {
        query = query.eq('class_id', classId)
      }

      const { data: arms, error: armsError } = await query
        .order('arm_name', { ascending: true })

      if (armsError) {
        console.error('[Dropdown Data API] Error fetching arms:', armsError.message)
      } else {
        result.arms = arms || []
        console.log(`[Dropdown Data API] ✅ Fetched ${arms?.length || 0} arms`)
      }
    }

    console.log('[Dropdown Data API] Returning dropdown data:', Object.keys(result))

    return NextResponse.json({
      data: result,
      meta: {
        schoolId,
        dataType,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[Dropdown Data API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dropdown data', details: error.message },
      { status: 500 }
    )
  }
}
