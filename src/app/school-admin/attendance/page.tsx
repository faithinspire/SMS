'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, School } from '@/types'

interface AttendanceRecord {
  id: string
  student_name: string
  admission_no: string
  class_name: string
  date: string
  status: 'PRESENT' | 'ABSENT'
  marked_by: string
}

export default function SchoolAdminAttendancePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterClass, setFilterClass] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | 'PRESENT' | 'ABSENT'>('')
  const [classes, setClasses] = useState<any[]>([])
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser) {
          router.push('/auth/school-admin/login')
          return
        }

        if (currentUser.role !== 'SCHOOL_ADMIN' && currentUser.role !== 'ADMIN') {
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

        // Get all classes
        const { data: classesData } = await supabase
          .from('class_arm_combos')
          .select('id, name')
          .eq('school_id', currentUser.school_id)
          .order('name')

        setClasses(classesData || [])

        // Load attendance records
        await loadAttendance(currentUser.school_id, selectedDate)
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const loadAttendance = async (schoolId: string, date: string) => {
    try {
      let query = supabase
        .from('attendance')
        .select(
          `
          id,
          date,
          status,
          marked_by,
          students(
            admission_no,
            users(full_name)
          ),
          class_arm_combos(name),
          users(full_name)
        `
        )
        .eq('school_id', schoolId)
        .order('date', { ascending: false })

      // Add date filter based on range mode
      query = query
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)

      const { data, error } = await query

      if (error) throw error

      const records: AttendanceRecord[] = (data || []).map((record: any) => ({
        id: record.id,
        student_name: record.students?.users?.full_name || 'Unknown',
        admission_no: record.students?.admission_no || 'N/A',
        class_name: record.class_arm_combos?.name || 'Unknown',
        date: record.date,
        status: record.status,
        marked_by: record.users?.full_name || 'Unknown',
      }))

      setAttendance(records)
    } catch (err) {
      console.error('Error loading attendance:', err)
    }
  }

  const handleReload = async () => {
    if (school) {
      await loadAttendance(school.id, selectedDate)
    }
  }

  // Filter attendance records
  const filteredAttendance = attendance.filter((record) => {
    const matchesClass = !filterClass || record.class_name.includes(filterClass)
    const matchesStatus = !filterStatus || record.status === filterStatus
    return matchesClass && matchesStatus
  })

  // Calculate statistics
  const presentCount = filteredAttendance.filter((r) => r.status === 'PRESENT').length
  const absentCount = filteredAttendance.filter((r) => r.status === 'ABSENT').length
  const attendancePercentage =
    filteredAttendance.length > 0
      ? ((presentCount / filteredAttendance.length) * 100).toFixed(1)
      : 0

  // Get unique dates for display
  const uniqueDates = [...new Set(attendance.map((r) => r.date))].sort().reverse()

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attendance Records</h1>
              <p className="text-gray-600 mt-1">View all student attendance across classes</p>
              <p className="text-sm text-gray-500 mt-2">{school.name}</p>
            </div>
            <div>
              <button
                onClick={handleReload}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Class
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as '' | 'PRESENT' | 'ABSENT')
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{filteredAttendance.length}</div>
            <div className="text-sm text-blue-700">Total Records</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-3xl font-bold text-green-600">{presentCount}</div>
            <div className="text-sm text-green-700">Present</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-3xl font-bold text-red-600">{absentCount}</div>
            <div className="text-sm text-red-700">Absent</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-3xl font-bold text-purple-600">{attendancePercentage}%</div>
            <div className="text-sm text-purple-700">Attendance Rate</div>
          </div>
        </div>

        {/* Attendance Table */}
        {filteredAttendance.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Admission #
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Marked By
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((record, idx) => (
                  <tr
                    key={record.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.student_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.admission_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.class_name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'PRESENT'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.marked_by}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No attendance records found for the selected filters</p>
          </div>
        )}

        {/* Available Dates */}
        {uniqueDates.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Dates</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {uniqueDates.slice(0, 12).map((date) => (
                <button
                  key={date}
                  className="px-3 py-2 bg-gray-100 hover:bg-blue-100 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors"
                >
                  {new Date(date).toLocaleDateString()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
