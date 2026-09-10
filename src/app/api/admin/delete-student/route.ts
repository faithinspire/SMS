import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function DELETE(req: NextRequest) {
  try {
    const { studentId } = await req.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // First, get the student's user_id and name
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('user_id, admission_number, full_name')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Delete from students table (cascades to student_subjects, etc.)
    const { error: deleteStudentError } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)

    if (deleteStudentError) {
      console.error('Error deleting student:', deleteStudentError)
      return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
    }

    // Delete the associated user from auth
    if (student.user_id) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(student.user_id)
      
      if (deleteUserError) {
        console.error('Error deleting user:', deleteUserError)
        // Still return success as student record was deleted
        return NextResponse.json({ 
          success: true, 
          message: `Student "${student.full_name}" (${student.admission_number}) deleted successfully (user account deletion had issues but record removed)`,
          studentId 
        }, { status: 200 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Student "${student.full_name}" (${student.admission_number}) deleted successfully`,
      studentId 
    }, { status: 200 })
  } catch (err: any) {
    console.error('[DELETE STUDENT] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
