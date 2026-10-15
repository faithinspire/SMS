/**
 * Get Dropdown Data for Student/Staff Registration
 * 
 * GET /api/school-admin/students/dropdown-data?schoolId=<schoolId>&dataType=<all|sessions|terms|classes|subjects>
 * 
 * Returns sessions, terms, classes, and subjects for registration forms
 * Uses ACTUAL schema column names (session_year, name, term_number, is_active)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId')
    const dataType = request.nextUrl.searchParams.get('dataType') || 'all'

    if (!schoolId) {
      console.error('[Dropdown API] Missing schoolId')
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log('[Dropdown API] Fetching for school:', schoolId, 'dataType:', dataType)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const result: any = {
      data: {
        sessions: [],
        terms: [],
        classes: [],
        subjects: [],
      },
    }

    // ============================================================================
    // LOAD ACADEMIC SESSIONS using ACTUAL schema: session_year, is_active
    // ============================================================================
    if (['all', 'sessions'].includes(dataType)) {
      try {
        console.log('[Dropdown API] Fetching academic_sessions...')
        const { data: sessions, error: sessionsError } = await supabase
          .from('academic_sessions')
          .select('id, session_year, start_year, end_year, is_active')
          .eq('school_id', schoolId)
          .order('start_year', { ascending: false })

        if (sessionsError) {
          console.error('[Dropdown API] Sessions error:', sessionsError.message)
        } else {
          console.log('[Dropdown API] ✅ Loaded', sessions?.length || 0, 'sessions')
          result.data.sessions = (sessions || []).map((s: any) => ({
            id: s.id,
            session_year: s.session_year,
            session_name: s.session_year, // For backwards compatibility
            start_year: s.start_year,
            end_year: s.end_year,
            is_active: s.is_active,
            label: s.session_year,
          }))
        }
      } catch (err) {
        console.error('[Dropdown API] Exception loading sessions:', err)
      }
    }

    // ============================================================================
    // LOAD ACADEMIC TERMS using ACTUAL schema: name, term_number, is_active
    // ============================================================================
    if (['all', 'terms'].includes(dataType)) {
      try {
        console.log('[Dropdown API] Fetching academic_terms...')
        const { data: terms, error: termsError } = await supabase
          .from('academic_terms')
          .select('id, name, term_number, session_id, is_active, school_id')
          .eq('school_id', schoolId)
          .order('session_id, term_number', { ascending: true })

        if (termsError) {
          console.error('[Dropdown API] Terms error:', termsError.message)
        } else {
          console.log('[Dropdown API] ✅ Loaded', terms?.length || 0, 'terms')
          result.data.terms = (terms || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            term_name: t.name, // For backwards compatibility
            term_number: t.term_number,
            session_id: t.session_id,
            is_active: t.is_active,
            label: t.name,
          }))
        }
      } catch (err) {
        console.error('[Dropdown API] Exception loading terms:', err)
      }
    }

    // ============================================================================
    // LOAD CLASS-ARM COMBOS with full relationships
    // ============================================================================
    if (['all', 'classes'].includes(dataType)) {
      try {
        console.log('[Dropdown API] Fetching class_arm_combos...')
        const { data: combos, error: classesError } = await supabase
          .from('class_arm_combos')
          .select(`
            id,
            school_id,
            class_id,
            arm_id,
            classes (id, name, type, level),
            arms (id, name)
          `)
          .eq('school_id', schoolId)
          .order('classes.name', { ascending: true })

        if (classesError) {
          console.error('[Dropdown API] Classes error:', classesError.message)
        } else {
          console.log('[Dropdown API] ✅ Loaded', combos?.length || 0, 'class-arm combos')
          result.data.classes = (combos || []).map((combo: any) => ({
            id: combo.id,
            class_id: combo.class_id,
            arm_id: combo.arm_id,
            classes: {
              id: combo.classes?.id,
              name: combo.classes?.name || 'Unknown',
              type: combo.classes?.type,
              level: combo.classes?.level,
            },
            arms: {
              id: combo.arms?.id,
              name: combo.arms?.name || 'Unknown',
            },
            class_name: combo.classes?.name || 'Unknown',
            arm_name: combo.arms?.name || 'Unknown',
            class_type: combo.classes?.type,
            class_level: combo.classes?.level,
            label: `${combo.classes?.name || 'Unknown'} - Arm ${combo.arms?.name || 'Unknown'}`,
          }))
        }
      } catch (err) {
        console.error('[Dropdown API] Exception loading classes:', err)
      }
    }

    // ============================================================================
    // LOAD SUBJECTS for the school (with fallback logic for old and new schools)
    // ============================================================================
    if (['all', 'subjects'].includes(dataType)) {
      try {
        console.log('[Dropdown API] Fetching subjects...')
        const { data: subjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, code, subject_type, department, is_active, applicable_to_levels')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (subjectsError) {
          console.error('[Dropdown API] Subjects error:', subjectsError.message)
        } else {
          console.log('[Dropdown API] ✅ Loaded', subjects?.length || 0, 'subjects')
          result.data.subjects = (subjects || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            subject_type: s.subject_type,
            department: s.department,
            is_active: s.is_active,
            applicable_to_levels: s.applicable_to_levels || [],
            label: s.name,
          }))
        }
      } catch (err) {
        console.error('[Dropdown API] Exception loading subjects:', err)
      }
    }

    console.log('[Dropdown API] ✅ Response:', {
      sessions: result.data.sessions?.length,
      terms: result.data.terms?.length,
      classes: result.data.classes?.length,
      subjects: result.data.subjects?.length,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Dropdown API] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load dropdown data', data: { sessions: [], terms: [], classes: [], subjects: [] } },
      { status: 500 }
    )
  }
}
