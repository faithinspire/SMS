import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/results/school-results-and-fees?schoolId=...&termId=...
 * 
 * Fetches ALL students (test + real) with their scores AND school fees
 * This combines student results with payment data for admin/principal/headteacher dashboards
 * 
 * Returns:
 * {
 *   classes: [...],
 *   fees: [...],
 *   summary: { totalStudents, totalPaid, totalDue }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const termId = searchParams.get('termId')

    console.log('[ResultsAndFees] Starting fetch:', { schoolId, termId, timestamp: new Date().toISOString() })

    if (!schoolId || !termId) {
      return NextResponse.json(
        { error: 'Missing required parameters: schoolId, termId' },
        { status: 400 }
      )
    }

    // ========================================================================
    // PART 1: FETCH ALL STUDENTS AND THEIR RESULTS
    // ========================================================================
    console.log('[ResultsAndFees] PART 1: Fetching all classes for school')

    const { data: classArmCombos, error: classError } = await supabase
      .from('class_arm_combos')
      .select(`
        id,
        school_id,
        class_id,
        arm_id,
        classes(id, name),
        arms(id, name)
      `)
      .eq('school_id', schoolId)
      .order('id', { ascending: true })

    if (classError) {
      console.error('[ResultsAndFees] Error fetching classes:', classError)
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: classError.message },
        { status: 500 }
      )
    }

    console.log('[ResultsAndFees] Found', classArmCombos?.length || 0, 'classes')

    // Fetch all students with scores
    const classResults: any[] = []
    let allStudents: any[] = []

    for (const classCombo of classArmCombos || []) {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id, 
          admission_number,
          users!students_user_id_fkey(id, full_name)
        `)
        .eq('school_id', schoolId)
        .eq('class_arm_combo_id', classCombo.id)
        .order('admission_number', { ascending: true })

      if (studentsError) {
        console.error('[ResultsAndFees] Error fetching students:', studentsError)
        continue
      }

      if (students && students.length > 0) {
        const studentIds = students.map((s: any) => s.id)

        // Fetch scores for all students
        const { data: scoreData } = await supabase
          .from('score_sheets')
          .select('student_id, test1, test2, test3, test4, exam, total, grade')
          .eq('school_id', schoolId)
          .eq('term_id', termId)
          .in('student_id', studentIds)

        const scoresByStudent: Record<string, any> = {}
        for (const score of scoreData || []) {
          if (!scoresByStudent[score.student_id]) {
            scoresByStudent[score.student_id] = {
              totalSum: 0,
              count: 0,
              scores: [],
            }
          }
          const total = score.total || 0
          scoresByStudent[score.student_id].scores.push(total)
          scoresByStudent[score.student_id].totalSum += total
          scoresByStudent[score.student_id].count += 1
        }

        // Format students with scores
        const studentResults = students.map((student: any) => {
          const stats = scoresByStudent[student.id]
          const overallScore = stats && stats.count > 0 ? Math.round(stats.totalSum / stats.count) : 0

          let overallGrade = 'F'
          if (overallScore >= 90) overallGrade = 'A'
          else if (overallScore >= 80) overallGrade = 'B'
          else if (overallScore >= 70) overallGrade = 'C'
          else if (overallScore >= 60) overallGrade = 'D'
          else if (overallScore >= 50) overallGrade = 'E'

          let performanceRating = 'Very Poor'
          if (overallScore >= 85) performanceRating = 'Excellent'
          else if (overallScore >= 75) performanceRating = 'Very Good'
          else if (overallScore >= 65) performanceRating = 'Good'
          else if (overallScore >= 55) performanceRating = 'Fair'
          else if (overallScore >= 40) performanceRating = 'Poor'

          return {
            id: student.id,
            full_name: student.users?.full_name || 'Unknown',
            admission_number: student.admission_number,
            overall_score: overallScore,
            overall_grade: overallGrade,
            performance_rating: performanceRating,
          }
        })

        allStudents = allStudents.concat(studentResults)

        classResults.push({
          id: classCombo.id,
          class_name: classCombo.classes?.name || 'Class',
          arm_name: classCombo.arms?.name || '',
          student_count: studentResults.length,
          students: studentResults.sort((a: any, b: any) => b.overall_score - a.overall_score),
        })
      }
    }

    console.log('[ResultsAndFees] Total students found:', allStudents.length)

    // ========================================================================
    // PART 2: FETCH SCHOOL FEES DATA
    // ========================================================================
    console.log('[ResultsAndFees] PART 2: Fetching school fees data')

    const { data: feesData } = await supabase
      .from('transactions')
      .select(`
        id,
        recipient_id,
        amount,
        payment_method,
        status,
        created_at,
        recipient_name
      `)
      .eq('school_id', schoolId)
      .in('type', ['STUDENT_PAYMENT', 'SCHOOL_FEE'])
      .order('created_at', { ascending: false })

    console.log('[ResultsAndFees] Found', feesData?.length || 0, 'fee transactions')

    // Process fees data
    const feesByStudent: Record<string, any> = {}
    const feesRecords: any[] = []

    for (const fee of feesData || []) {
      const studentFee = allStudents.find((s: any) => s.id === fee.recipient_id)

      if (!feesByStudent[fee.recipient_id]) {
        feesByStudent[fee.recipient_id] = {
          student_id: fee.recipient_id,
          student_name: studentFee?.full_name || fee.recipient_name || 'Unknown',
          admission_number: studentFee?.admission_number || 'N/A',
          total_paid: 0,
          payment_count: 0,
          last_payment_date: null,
        }
      }

      if (fee.status === 'COMPLETED') {
        feesByStudent[fee.recipient_id].total_paid += fee.amount || 0
        feesByStudent[fee.recipient_id].payment_count += 1
        feesByStudent[fee.recipient_id].last_payment_date = fee.created_at
      }

      feesRecords.push({
        id: fee.id,
        student_id: fee.recipient_id,
        student_name: studentFee?.full_name || fee.recipient_name || 'Unknown',
        amount: fee.amount,
        payment_method: fee.payment_method || 'N/A',
        status: fee.status === 'COMPLETED' ? 'PAID' : fee.status || 'PENDING',
        created_at: fee.created_at,
      })
    }

    // ========================================================================
    // PART 3: CALCULATE SUMMARY
    // ========================================================================
    const totalPaid = Object.values(feesByStudent).reduce((sum: number, f: any) => sum + f.total_paid, 0)
    const studentsWithPayments = Object.values(feesByStudent).length

    const summary = {
      total_students: allStudents.length,
      students_with_fees_paid: studentsWithPayments,
      total_fees_collected: totalPaid,
      average_per_student: studentsWithPayments > 0 ? Math.round(totalPaid / studentsWithPayments) : 0,
      school_id: schoolId,
      term_id: termId,
    }

    console.log('[ResultsAndFees] Summary:', summary)

    // ========================================================================
    // PART 4: RETURN COMBINED DATA
    // ========================================================================
    return NextResponse.json({
      success: true,
      classes: classResults,
      fees: {
        transactions: feesRecords,
        by_student: Object.values(feesByStudent),
      },
      summary,
      message: `Found ${allStudents.length} students and ₦${totalPaid} in fees`,
    })
  } catch (error: any) {
    console.error('[ResultsAndFees] Exception:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
