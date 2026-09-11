export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function DELETE(req: NextRequest) {
  try {
    const { studentId } = await req.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    console.log('Attempting to delete student with ID:', studentId)

    // Get the student - could be in students table or users table
    let student: any = null
    let fromTable = 'unknown'

    // First try students table
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('user_id, admission_number, full_name, id')
      .eq('id', studentId)
      .single()

    if (!studentError && studentData) {
      student = studentData
      fromTable = 'students'
      console.log('Found student in students table')
    } else {
      // Try users table (student might be registered as user only)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', studentId)
        .single()

      if (!userError && userData) {
        student = userData
        fromTable = 'users'
        console.log('Found student in users table')
      }
    }

    if (!student) {
      console.error('Student not found with ID:', studentId)
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Delete from appropriate table
    if (fromTable === 'students') {
      const { error: deleteStudentError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (deleteStudentError) {
        console.error('Error deleting from students table:', deleteStudentError)
        return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
      }
    }

    // Delete from users table if it's the primary record
    if (student.user_id || fromTable === 'users') {
      const userId = student.user_id || student.id

      // First delete the users record
      const { error: deleteUserRecordError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteUserRecordError) {
        console.error('Error deleting user record:', deleteUserRecordError)
      }

      // Then delete from auth
      try {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)
        if (deleteAuthError) {
          console.error('Warning: Error deleting auth user:', deleteAuthError)
          // Continue anyway - user record is already deleted
        }
      } catch (authErr) {
        console.error('Warning: Could not delete auth user:', authErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Student "${student.full_name}" ${student.admission_number ? `(${student.admission_number}) ` : ''}deleted successfully`,
      studentId,
    }, { status: 200 })
  } catch (err: any) {
    console.error('[DELETE STUDENT] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

