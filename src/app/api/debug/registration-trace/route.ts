import { NextRequest, NextResponse } from 'next/server'
import { RegistrationDiagnosticService } from '@/services/registration-diagnostic.service'
export const dynamic = 'force-dynamic'


/**
 * REGISTRATION DATA PIPELINE DIAGNOSTIC
 * 
 * GET /api/debug/registration-trace?schoolId=UUID
 * 
 * Traces the complete data pipeline from Supabase through to React state
 * Shows exactly where data is disappearing
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json({
        error: 'schoolId parameter required',
        example: '/api/debug/registration-trace?schoolId=xxx-xxx-xxx',
      })
    }

    console.log('\n' + '='.repeat(80))
    console.log('ðŸ” REGISTRATION DATA PIPELINE DIAGNOSTIC')
    console.log('='.repeat(80))
    console.log('School ID:', schoolId)
    console.log('='.repeat(80) + '\n')

    // Run the diagnostic
    const results = await RegistrationDiagnosticService.traceDataPipeline(schoolId)

    // Get the report
    const report = RegistrationDiagnosticService.getReport()
    const isHealthy = RegistrationDiagnosticService.isHealthy()

    console.log('\n' + report)
    console.log('\n' + '='.repeat(80))
    console.log('PIPELINE STATUS:', isHealthy ? 'âœ… HEALTHY' : 'âŒ BROKEN')
    console.log('='.repeat(80) + '\n')

    return NextResponse.json({
      schoolId,
      status: isHealthy ? 'healthy' : 'broken',
      diagnostics: results,
      report,
      summary: {
        totalStages: results.length,
        healthy: results.filter((r) => r.status === 'OK').length,
        empty: results.filter((r) => r.status === 'EMPTY').length,
        errors: results.filter((r) => r.status === 'ERROR').length,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

