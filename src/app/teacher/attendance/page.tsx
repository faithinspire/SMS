'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, School } from '@/types'

interface Student {
  id: string
  name: string
  admission_no: string
  present: boolean
}

interface ClassData {
  class_arm_combo_id: string
  name: string
}

export default function TeacherAttendancePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [classes, setClasses] = useState<ClassData[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Load user and school on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true)
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser) {
          router.push('/auth/teacher/login')
          return
        }

        if (currentUser.role !== 'teacher') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        // Get school data
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        if (schoolError) throw schoolError
        setSchool(schoolData)

        // Get teacher's classes
        const { data: classData, error: classError } = await supabase
          .from('class_arm_combos')
          .select('id, name')
          .eq('school_id', currentUser.school_id)
          .order('name')

        if (classError) throw classError
        setClasses(classData || [])

        if (classData && classData.length > 0) {
          setSelectedClass(classData[0].id)
        }
      } catch (err) {
        console.error('Error loading user data:', err)
        router.push('/auth/teacher/login')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  // Load students when class is selected
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedClass || !user) return

      try {
        setLoading(true)

        // Get students in the class
        const { data: classStudents, error: classError } = await supabase
          .from('class_arm_combo_students')
          .select('student_id')
          .eq('class_arm_combo_id', selectedClass)

        if (classError) throw classError

        if (!classStudents || classStudents.length === 0) {
          setStudents([])
          return
        }

        const studentIds = classStudents.map((cs: any) => cs.student_id)

        // Get student details
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id, first_name, last_name, admission_no')
          .in('id', studentIds)
          .order('first_name')

        if (studentError) throw studentError

        // Get existing attendance records for today
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('student_id, status')
          .eq('class_arm_combo_id', selectedClass)
          .eq('date', selectedDate)

        // Combine data
        const studentsWithAttendance = (studentData || []).map((student: any) => {
          const attendance = attendanceData?.find(
            (a: any) => a.student_id === student.id
          )
          return {
            id: student.id,
            name: `${student.first_name} ${student.last_name}`,
            admission_no: student.admission_no,
            present: attendance?.status === 'PRESENT',
          }
        })

        setStudents(studentsWithAttendance)
      } catch (err) {
        console.error('Error loading students:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [selectedClass, user, selectedDate])

  const toggleAttendance = (studentId: string) => {
    setStudents(
      students.map((student) =>
        student.id === studentId
          ? { ...student, present: !student.present }
          : student
      )
    )
  }

  const handleSaveAttendance = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      if (!selectedClass) {
        setMessage({ type: 'error', text: 'Please select a class' })
        return
      }

      // Delete existing records for this date and class
      await supabase
        .from('attendance')
        .delete()
        .eq('class_arm_combo_id', selectedClass)
        .eq('date', selectedDate)

      // Insert new attendance records
      const attendanceRecords = students.map((student) => ({
        school_id: school?.id,
        class_arm_combo_id: selectedClass,
        student_id: student.id,
        date: selectedDate,
        status: student.present ? 'PRESENT' : 'ABSENT',
        marked_by: user?.id,
        marked_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('attendance')
        .insert(attendanceRecords)

      if (error) throw error

      const presentCount = students.filter((s) => s.present).length
      const absentCount = students.length - presentCount

      setMessage({
        type: 'success',
        text: `✅ Attendance saved! Present: ${presentCount}, Absent: ${absentCount}`,
      })

      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (err) {
      console.error('Error saving attendance:', err)
      setMessage({ type: 'error', text: '❌ Error saving attendance' })
    } finally {
      setSaving(false)
    }
  }

  const handleSelectAll = () => {
    setStudents(students.map((s) => ({ ...s, present: true })))
  }

  const handleDeselectAll = () => {
    setStudents(students.map((s) => ({ ...s, present: false })))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Error loading data</div>
      </div>
    )
  }

  const presentCount = students.filter((s) => s.present).length
  const absentCount = students.length - presentCount

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
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
                  <option key={cls.class_arm_combo_id} value={cls.class_arm_combo_id}>
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
                onClick={handleSelectAll}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {students.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{students.length}</div>
              <div className="text-sm text-blue-700">Total Students</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-3xl font-bold text-green-600">{presentCount}</div>
              <div className="text-sm text-green-700">Present</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-3xl font-bold text-red-600">{absentCount}</div>
              <div className="text-sm text-red-700">Absent</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => toggleAttendance(student.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    student.present
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        student.present
                          ? 'bg-green-500 border-green-600'
                          : 'bg-white border-gray-400'
                      }`}
                    >
                      {student.present && (
                        <span className="text-white text-sm font-bold">✓</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-600">{student.admission_no}</p>
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
                Cancel
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Save Attendance (${presentCount} Present)`}
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
