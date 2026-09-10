import { supabase } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/fix-subjects?schoolId=YOUR_SCHOOL_ID
 * 
 * This emergency endpoint fixes the "No subject available" bug by:
 * 1. Identifying subjects with empty applicable_to_levels
 * 2. Populating them based on subject type
 * 3. Returning diagnostic information
 * 
 * Usage:
 * fetch('/api/fix-subjects?schoolId=YOUR_SCHOOL_ID', { method: 'POST' })
 */

export async function POST(request: NextRequest) {
  try {
    // Get schoolId from query params
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json({
        error: 'schoolId parameter is required',
        example: '/api/fix-subjects?schoolId=YOUR_SCHOOL_ID'
      }, { status: 400 })
    }

    console.log(`🔧 [FIX SUBJECTS] Starting repair for school: ${schoolId}`)

    // Step 1: Get all subjects for the school
    const { data: allSubjects, error: fetchError } = await supabase
      .from('subjects')
      .select('id, name, code, applicable_to_levels')
      .eq('school_id', schoolId)

    if (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch subjects',
        details: fetchError.message
      }, { status: 500 })
    }

    console.log(`📊 [FIX SUBJECTS] Found ${allSubjects?.length || 0} total subjects`)

    // Step 2: Identify broken subjects (empty or null applicable_to_levels)
    const brokenSubjects = (allSubjects || []).filter(s => 
      !s.applicable_to_levels || s.applicable_to_levels.length === 0
    )

    console.log(`❌ [FIX SUBJECTS] Found ${brokenSubjects.length} subjects with empty applicable_to_levels`)

    if (brokenSubjects.length === 0) {
      return NextResponse.json({
        status: 'already_fixed',
        message: 'All subjects have applicable_to_levels populated',
        totalSubjects: allSubjects?.length || 0,
        fixedSubjects: 0
      })
    }

    // Step 3: Categorize and fix subjects
    const updates: any[] = []

    for (const subject of brokenSubjects) {
      let newLevels: number[] = []
      const name = subject.name.toLowerCase()

      // PRIMARY subjects (levels 1-6)
      if (name.includes('english') || 
          name.includes('mathematics') || name.includes('math') ||
          name.includes('science') || 
          name.includes('social studies') || name.includes('social science') ||
          name.includes('civic') || 
          name.includes('physical education') || name.includes('pe') ||
          name.includes('art') || 
          name.includes('music') || 
          name.includes('home economics') ||
          name.includes('ict') || name.includes('computer')) {
        // Check if it's primary-only or both
        if (name.includes('agriculture') || name.includes('technical drawing')) {
          newLevels = [9, 10, 11, 12, 13, 14] // Secondary only
        } else {
          newLevels = [1, 2, 3, 4, 5, 6] // Primary
        }
      } 
      // SECONDARY subjects (levels 9-14)
      else if (name.includes('biology') || name.includes('chemistry') || name.includes('physics') ||
               name.includes('history') || name.includes('geography') ||
               name.includes('agriculture') || name.includes('technical drawing') ||
               name.includes('computer science') || name.includes('computing')) {
        newLevels = [9, 10, 11, 12, 13, 14]
      }
      // SSS-only subjects (levels 12-14)
      else if (name.includes('economics') || name.includes('accounting') || 
               name.includes('government') || name.includes('literature') ||
               name.includes('further mathematics')) {
        newLevels = [12, 13, 14]
      }
      // Default fallback: secondary
      else {
        newLevels = [9, 10, 11, 12, 13, 14]
      }

      updates.push({
        id: subject.id,
        name: subject.name,
        oldLevels: subject.applicable_to_levels,
        newLevels: newLevels
      })

      console.log(`🔨 Fixing "${subject.name}": ${newLevels.join(', ')}`)
    }

    // Step 4: Apply updates to database
    const updatePromises = updates.map(update =>
      supabase
        .from('subjects')
        .update({ applicable_to_levels: update.newLevels })
        .eq('id', update.id)
    )

    const updateResults = await Promise.all(updatePromises)

    // Check for errors
    const failedUpdates = updateResults.filter(r => r.error)
    if (failedUpdates.length > 0) {
      return NextResponse.json({
        error: 'Some subjects failed to update',
        failedCount: failedUpdates.length,
        totalAttempted: updates.length,
        failures: failedUpdates.map(r => r.error?.message)
      }, { status: 500 })
    }

    console.log(`✅ [FIX SUBJECTS] Successfully fixed ${updates.length} subjects`)

    // Step 5: Verify the fix by checking subjects per class
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, level, type')
      .eq('school_id', schoolId)

    const verificationResults: any[] = []
    for (const cls of classes || []) {
      const { data: matchingSubjects } = await supabase
        .from('subjects')
        .select('id, name, applicable_to_levels')
        .eq('school_id', schoolId)
        // Match subjects where applicable_to_levels contains this class level
        // Note: This is a client-side filter since Supabase can't easily do @> operator
        .then(result => ({
          data: (result.data || []).filter(s => 
            s.applicable_to_levels && s.applicable_to_levels.includes(cls.level)
          )
        }))

      verificationResults.push({
        className: cls.name,
        classLevel: cls.level,
        matchingSubjectCount: matchingSubjects?.length || 0,
        subjects: matchingSubjects?.slice(0, 5).map(s => s.name) || []
      })
    }

    return NextResponse.json({
      status: 'fixed',
      message: 'Subject applicable_to_levels have been repaired',
      summary: {
        totalSubjectsInSchool: allSubjects?.length || 0,
        subjectsFixed: updates.length,
        fixedDetails: updates
      },
      verification: {
        classCount: classes?.length || 0,
        classSubjectMapping: verificationResults
      },
      nextSteps: [
        '1. Refresh the registration modal (close and reopen)',
        '2. Try selecting a class again',
        '3. Subjects should now appear in the subject list',
        '4. If still no subjects, check the verification data above'
      ]
    })

  } catch (error: any) {
    console.error('❌ [FIX SUBJECTS] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * GET /api/fix-subjects?schoolId=YOUR_SCHOOL_ID
 * 
 * Diagnostic endpoint that shows which subjects need fixing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json({
        error: 'schoolId parameter is required'
      }, { status: 400 })
    }

    console.log(`🔍 [SUBJECTS DIAGNOSTIC] Scanning school: ${schoolId}`)

    // Get all subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code, applicable_to_levels')
      .eq('school_id', schoolId)

    // Get all classes
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, level, type')
      .eq('school_id', schoolId)

    // Analyze
    const brokenSubjects = (subjects || []).filter(s => 
      !s.applicable_to_levels || s.applicable_to_levels.length === 0
    )

    const subjectsPerClass: any = {}
    for (const cls of classes || []) {
      const matching = (subjects || []).filter(s =>
        s.applicable_to_levels && s.applicable_to_levels.includes(cls.level)
      )
      subjectsPerClass[`${cls.name} (level ${cls.level})`] = {
        subjectCount: matching.length,
        subjects: matching.map(s => s.name)
      }
    }

    return NextResponse.json({
      school_id: schoolId,
      diagnostics: {
        totalSubjects: subjects?.length || 0,
        subjectsWithEmptyLevels: brokenSubjects.length,
        brokenSubjects: brokenSubjects.map(s => ({
          id: s.id,
          name: s.name,
          code: s.code,
          issue: 'applicable_to_levels is empty or null'
        })),
        subjectsPerClass,
        status: brokenSubjects.length === 0 ? '✅ All subjects configured' : `❌ ${brokenSubjects.length} subjects need fixing`
      },
      recommendation: brokenSubjects.length > 0 
        ? `Run: POST /api/fix-subjects?schoolId=${schoolId}`
        : 'System is properly configured'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error.message
    }, { status: 500 })
  }
}
