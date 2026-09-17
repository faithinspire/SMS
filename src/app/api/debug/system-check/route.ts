import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/debug/system-check?schoolId=...
 * 
 * Comprehensive system diagnostic endpoint
 * Returns status of all components needed for result pages
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      schoolId: schoolId || 'not provided',
      checks: {},
    }

    // ========================================================================
    // CHECK 1: Can we connect to Supabase?
    // ========================================================================
    diagnostics.checks.supabaseConnection = {
      status: 'checking',
    }
    try {
      const { data: testData, error: testError } = await supabase
        .from('schools')
        .select('id')
        .limit(1)

      diagnostics.checks.supabaseConnection = {
        status: testError ? 'error' : 'ok',
        error: testError?.message,
        canQuerySchools: true,
      }
    } catch (err: any) {
      diagnostics.checks.supabaseConnection = {
        status: 'error',
        error: err.message,
      }
    }

    // ========================================================================
    // CHECK 2: Do schools exist?
    // ========================================================================
    try {
      const { data: schools, error: err } = await supabase
        .from('schools')
        .select('id, name')

      diagnostics.checks.schools = {
        status: 'ok',
        count: schools?.length || 0,
        list: schools || [],
      }
    } catch (err: any) {
      diagnostics.checks.schools = {
        status: 'error',
        error: err.message,
      }
    }

    // ========================================================================
    // CHECK 3: Do academic_sessions exist?
    // ========================================================================
    try {
      const { data: sessions, error: err } = await supabase
        .from('academic_sessions')
        .select('id, school_id, session_year')

      diagnostics.checks.academicSessions = {
        status: 'ok',
        count: sessions?.length || 0,
        list: sessions || [],
      }

      if (schoolId) {
        const { data: schoolSessions } = await supabase
          .from('academic_sessions')
          .select('id, school_id, session_year')
          .eq('school_id', schoolId)

        diagnostics.checks.academicSessionsForSchool = {
          status: 'ok',
          count: schoolSessions?.length || 0,
          list: schoolSessions || [],
        }
      }
    } catch (err: any) {
      diagnostics.checks.academicSessions = {
        status: 'error',
        error: err.message,
      }
    }

    // ========================================================================
    // CHECK 4: Do academic_terms exist?
    // ========================================================================
    try {
      const { data: terms, error: err } = await supabase
        .from('academic_terms')
        .select('id, session_id, term_name, term_number')

      diagnostics.checks.academicTerms = {
        status: 'ok',
        count: terms?.length || 0,
        sample: terms?.slice(0, 3) || [],
      }
    } catch (err: any) {
      diagnostics.checks.academicTerms = {
        status: 'error',
        error: err.message,
      }
    }

    // ========================================================================
    // CHECK 5: Do classes exist?
    // ========================================================================
    try {
      const { data: classes, error: err } = await supabase
        .from('class_arm_combos')
        .select('id, school_id')

      diagnostics.checks.classArmCombos = {
        status: 'ok',
        count: classes?.length || 0,
      }

      if (schoolId) {
        const { data: schoolClasses } = await supabase
          .from('class_arm_combos')
          .select('id, school_id')
          .eq('school_id', schoolId)

        diagnostics.checks.classArmCombosForSchool = {
          status: 'ok',
          count: schoolClasses?.length || 0,
        }
      }
    } catch (err: any) {
      diagnostics.checks.classArmCombos = {
        status: 'error',
        error: err.message,
      }
    }

    // ========================================================================
    // CHECK 6: Do students exist?
    // ========================================================================
    try {
      const { data: students, error: err } = await supabase
        .from('students')
        .select('id, school_id')

      diagnostics.checks.students = {
        status: 'ok',
        count: students?.length || 0,
      }

      if (schoolId) {
        const { data: schoolStudents } = await supabase
          .from('students')
          .select('id, school_id')
          .eq('school_id', schoolId)

        diagnostics.checks.studentsForSchool = {
          status: 'ok',
          count: schoolStudents?.length || 0,
        }
      }
    } catch (err: any) {
      diagnostics.checks.students = {
        status: 'error',
        error: err.message,
      }
    }

    // ========================================================================
    // CHECK 7: Do score_sheets exist?
    // ========================================================================
    try {
      const { data: scores, error: err } = await supabase
        .from('score_sheets')
        .select('id, school_id')

      diagnostics.checks.scoreSheets = {
        status: 'ok',
        count: scores?.length || 0,
      }
    } catch (err: any) {
      diagnostics.checks.scoreSheets = {
        status: 'error',
        error: err.message,
      }
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    const allOk = Object.values(diagnostics.checks).every((check: any) => check.status === 'ok')

    diagnostics.summary = {
      allSystemsOk: allOk,
      issues: Object.entries(diagnostics.checks)
        .filter(([_, check]: any) => check.status !== 'ok')
        .map(([name, check]: any) => `${name}: ${check.error || 'unknown error'}`),
    }

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
