'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import TeacherDataService, { ClassStudentData } from '@/services/teacher-data.service'
import { TeacherContextService } from '@/services/teacher-context.service'
import { User, School } from '@/types'

interface AttendanceRecord {
  id: string
  name: string
  admissionNumber: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
}

export default function TeacherAttendancePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [error, setError] = useState<string | null>(null)

  // Load user, school, and classes on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current user
        const currentUser = await AuthService.getCurrentUser()
        if (!currentUser || currentUser.role !== 'TEACHER') {
          router.push('/auth/teacher/login')
          return
        }

        setUser(currentUser)

        // Get school
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        if (schoolError || !schoolData) {
          throw new Error('School not found')
        }

        setSchool(schoolData)

        // Get teacher's context and classes
        const context = await TeacherContextService.getCurrentTeacherContext()
        
        // Format classes
        const formattedClasses = context.managedClasses.map((cls) => ({
          id: cls.id,
          name: `${cls.name} - ${cls.armName}`,
        }))

        setClasses(formattedClasses)

        if (formattedClasses.length > 0) {
          setSelectedClass(formattedClasses[0].id)
        }
      } catch (err) {
        console.error('[Attendance] Error loading user data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  // Load students when class is selected
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedClass || !user) {
        setStudents([])
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Use TeacherDataService to get students - SAFE, no ambiguous joins
        const classStudents = await TeacherDataService.getClassStudents(
          user.school_id,
          selectedClass
        )

        // Get existing attendance records for today
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('student_id, status')
          .eq('class_arm_combo_id', selectedClass)
          .eq('date', selectedDate)
          .eq('school_id', user.school_id)

        if (attendanceError) {
          console.warn('[Attendance] Error fetching attendance records:', attendanceError)
        }

        // Create attendance lookup map
        const attendanceMap = new Map<string, string>()
        ;(attendanceData || []).forEach((record: any) => {
          attendanceMap.set(record.student_id, record.status)
        })

        // Combine data
        const studentsWithAttendance: AttendanceRecord[] = classStudents.map(
          (student: ClassStudentData) => ({
            id: student.id,
            name: student.name,
            admissionNumber: student.admissionNumber,
            status: (attendanceMap.get(student.id) || 'ABSENT') as
              | 'PRESENT'
              | 'ABSENT'
              | 'LATE'
              | 'EXCUSED',
          })
        )

        setStudents(studentsWithAttendance)
      } catch (err) {
        console.error('[Attendance] Error loading students:', err)
        setError(err instanceof Error ? err.message : 'Failed to load students')
        setStudents([])
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [selectedClass, user, selectedDate])

  const toggleStatus = (studentId: string) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => {
        if (student.id !== studentId) return student

        // Cycle through: ABSENT -> PRESENT -> LATE -> EXCUSED -> ABSENT
        const statusCycle: Array<'ABSENT' | 'PRESENT' | 'LATE' | 'EXCUSED'> = [
          'ABSENT',
          'PRESENT',
          'LATE',
          'EXCUSED',
        ]
        const currentIndex = statusCycle.indexOf(student.status)
        const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length]

        return { ...student, status: nextStatus }
      })
    )
  }

  const handleSaveAttendance = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })
      setError(null)

      if (!selectedClass || !user || !school) {
        setMessage({ type: 'error', text: 'Invalid selection' })
        return
      }

      if (students.length === 0) {
        setMessage({ type: 'error', text: 'No students to save' })
        return
      }

      // Delete existing records for this date and class
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('class_arm_combo_id', selectedClass)
        .eq('date', selectedDate)
        .eq('school_id', user.school_id)

      if (deleteError) {
        throw new Error(`Delete failed: ${deleteError.message}`)
      }

      // Insert new attendance records
      const attendanceRecords = students.map((student) => ({
        school_id: user.school_id,
        class_arm_combo_id: selectedClass,
        student_id: student.id,
        date: selectedDate,
        status: student.status,
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabase
        .from('attendance')
        .insert(attendanceRecords)

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`)
      }

      const presentCount = students.filter((s) => s.status === 'PRESENT').length
      const absentCount = students.filter((s) => s.status === 'ABSENT').length
      const lateCount = students.filter((s) => s.status === 'LATE').length
      const excusedCount = students.filter((s) => s.status === 'EXCUSED').length

      setMessage({
        type: 'success',
        text: `✅ Attendance saved! Present: ${presentCount}, Absent: ${absentCount}, Late: ${lateCount}, Excused: ${excusedCount}`,
      })

      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err) {
      console.error('[Attendance] Error saving:', err)
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error saving attendance',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSelectAll = (status: 'PRESENT' | 'ABSENT') => {
    setStudents((prevStudents) =>
      prevStudents.map((s) => ({ ...s, status }))
    )
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Error loading data</p>
          <button
            onClick={() => router.push('/auth/teacher/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  const presentCount = students.filter((s) => s.status === 'PRESENT').length
  const absentCount = students.filter((s) => s.status === 'ABSENT').length
  const lateCount = students.filter((s) => s.status === 'LATE').length
  const excusedCount = students.filter((s) => s.status === 'EXCUSED').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📍 Attendance Management</h1>
              <p className="text-gray-600 mt-1">Mark student attendance for class</p>
              <p className="text-sm text-gray-500 mt-2">{school.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Teacher: {user.full_name}</p>
              <p className="text-sm text-gray-500">Role: {user.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {/* Class and Date Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={() => handleSelectAll('PRESENT')}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm"
              >
                All Present
              </button>
              <button
                onClick={() => handleSelectAll('ABSENT')}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm"
              >
                All Absent
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {students.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{students.length}</div>
              <div className="text-xs text-blue-700 font-medium">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              <div className="text-xs text-green-700 font-medium">Present</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              <div className="text-xs text-red-700 font-medium">Absent</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
              <div className="text-xs text-yellow-700 font-medium">Late</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{excusedCount}</div>
              <div className="text-xs text-orange-700 font-medium">Excused</div>
            </div>
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Attendance List */}
        {students.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-6">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => toggleStatus(student.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    student.status === 'PRESENT'
                      ? 'bg-green-50 border-green-500'
                      : student.status === 'ABSENT'
                        ? 'bg-red-50 border-red-300'
                        : student.status === 'LATE'
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-orange-50 border-orange-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold ${
                        student.status === 'PRESENT'
                          ? 'bg-green-500 border-green-600 text-white'
                          : student.status === 'ABSENT'
                            ? 'bg-red-400 border-red-600 text-white'
                            : student.status === 'LATE'
                              ? 'bg-yellow-400 border-yellow-600 text-white'
                              : 'bg-orange-400 border-orange-600 text-white'
                      }`}
                    >
                      {student.status === 'PRESENT' && '✓'}
                      {student.status === 'ABSENT' && '✗'}
                      {student.status === 'LATE' && 'L'}
                      {student.status === 'EXCUSED' && 'E'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                      <p className="text-xs text-gray-600">{student.admissionNumber}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="border-t border-gray-200 p-6 flex justify-end gap-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving || students.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : `Save (${presentCount} Present)`}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">
              {selectedClass
                ? 'No students found in this class'
                : 'Select a class to mark attendance'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
