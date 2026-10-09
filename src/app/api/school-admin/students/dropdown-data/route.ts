/**
 * Get Dropdown Data for Student/Staff Registration
 * 
 * GET /api/school-admin/students/dropdown-data?schoolId=<schoolId>&dataType=<all|sessions|terms|classes|subjects>
 * 
 * Returns sessions, terms, classes, and subjects for registration forms
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId')
    const dataType = request.nextUrl.searchParams.get('dataType') || 'all'

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log('[Dropdown Data API] Fetching data for school:', schoolId, 'type:', dataType)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const result: any = {
      data: {},
    }

    // Load academic sessions
    if (['all', 'sessions'].includes(dataType)) {
      const { data: sessions, error: sessionsError } = await supabase
        .from('academic_sessions')
        .select('id, name, start_year, end_year, status')
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE')
        .order('start_year', { ascending: false })

      if (sessionsError) {
        console.error('[Dropdown Data API] Error loading sessions:', sessionsError)
      } else {
        result.data.sessions = sessions || []
      }
    }

    // Load terms
    if (['all', 'terms'].includes(dataType)) {
      const { data: terms, error: termsError } = await supabase
        .from('academic_terms')
        .select('id, name, term_number, session_id, status')
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE')
        .order('term_number', { ascending: true })

      if (termsError) {
        console.error('[Dropdown Data API] Error loading terms:', termsError)
      } else {
        result.data.terms = terms || []
      }
    }

    // Load class-arm combos
    if (['all', 'classes'].includes(dataType)) {
      const { data: classes, error: classesError } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          classes (id, name, section),
          arms (id, name)
        `)
        .eq('school_id', schoolId)
        .order('classes.name', { ascending: true })

      if (classesError) {
        console.error('[Dropdown Data API] Error loading classes:', classesError)
      } else {
        const formattedClasses = (classes || []).map((combo: any) => ({
          id: combo.id,
          class_name: combo.classes?.name || 'Unknown',
          arm_name: combo.arms?.name || 'Unknown',
          label: `${combo.classes?.name || 'Unknown'} - ${combo.arms?.name || 'Unknown'}`,
        }))
        result.data.classes = formattedClasses
      }
    }

    // Load subjects
    if (['all', 'subjects'].includes(dataType)) {
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, code, subject_type')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })

      if (subjectsError) {
        console.error('[Dropdown Data API] Error loading subjects:', subjectsError)
      } else {
        result.data.subjects = subjects || []
      }
    }

    console.log('[Dropdown Data API] ✅ Loaded data:', {
      sessions: result.data.sessions?.length,
      terms: result.data.terms?.length,
      classes: result.data.classes?.length,
      subjects: result.data.subjects?.length,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Dropdown Data API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load dropdown data' },
      { status: 500 }
    )
  }
}
