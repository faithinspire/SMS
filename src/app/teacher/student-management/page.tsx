'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { TeacherService } from '@/services/teacher.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

interface Student {
  id: string
  user_id: string
  admission_number: string
  full_name?: string
  photo_url?: string
  class_name?: string
  arm_name?: string
  email?: string
}

export default function StudentManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [classStudents, setClassStudents] = useState<Student[]>([])
  const [subjectStudents, setSubjectStudents] = useState<Student[]>([])
  const [managedClasses, setManagedClasses] = useState<any[]>([])
  const [taughtSubjects, setTaughtSubjects] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [loadingClass, setLoadingClass] = useState(false)
  const [loadingSubject, setLoadingSubject] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'TEACHER') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load school
      if (currentUser.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()
        setSchool(schoolData)

        // Load teacher data
        const dashboardData = await TeacherService.getTeacherDashboard(
          currentUser.id,
          currentUser.school_id
        )
        setManagedClasses(dashboardData.managedClasses || [])
        setTaughtSubjects(dashboardData.taughtSubjects || [])

        // Load default class students if classes available
        if (dashboardData.managedClasses?.length > 0) {
          setSelectedClass(dashboardData.managedClasses[0].id)
          await loadClassStudents(dashboardData.managedClasses[0].id, currentUser.school_id)
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassStudents = async (classArmComboId: string, schoolId: string) => {
    try {
      setLoadingClass(true)
      const students = await TeacherService.getClassStudents(classArmComboId, schoolId)
      
      // TeacherService returns already formatted data with users!students_user_id_fkey
      const formattedStudents = (students || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        admission_number: item.admission_number,
        full_name: item.users?.full_name || 'Unknown',
        photo_url: item.users?.photo_url,
        email: item.users?.email,
      }))

      setClassStudents(formattedStudents)
    } catch (error) {
      console.error('Error loading class students:', error)
      setClassStudents([])
    } finally {
      setLoadingClass(false)
    }
  }

  const loadSubjectStudents = async (subjectId: string, schoolId: string) => {
    try {
      setLoadingSubject(true)
      const students = await TeacherService.getSubjectStudents(subjectId, user.id, schoolId)
      
      // TeacherService returns data with nested structure from student_subjects
      const formattedStudents = (students || []).map((item: any) => ({
        id: item.id,
        user_id: item.students?.user_id,
        admission_number: item.students?.admission_number,
        full_name: item.students?.users?.full_name || 'Unknown',
        photo_url: item.students?.users?.photo_url,
        email: item.students?.users?.email,
        class_name: item.students?.class_arm_combos?.classes?.name,
        arm_name: item.students?.class_arm_combos?.arms?.name,
      }))

      setSubjectStudents(formattedStudents)
    } catch (error) {
      console.error('Error loading subject students:', error)
      setSubjectStudents([])
    } finally {
      setLoadingSubject(false)
    }
  }

  const handleClassChange = async (classId: string) => {
    setSelectedClass(classId)
    if (classId && user?.school_id) {
      await loadClassStudents(classId, user.school_id)
    }
  }

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubject(subjectId)
    if (subjectId && user?.school_id) {
      // Find the subject object to get subject_id
      const subject = taughtSubjects.find((s: any) => s.id === subjectId)
      if (subject) {
        await loadSubjectStudents(subject.subject_id, user.school_id)
      }
    }
  }

  const StudentCard = ({ student }: { student: Student }) => {
    const filteredSearch = searchTerm ? (
      student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : true

    if (!filteredSearch) return null

    return (
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition p-4">
        <div className="flex gap-4">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={student.full_name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
              📷
            </div>
          )}

          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{student.full_name || 'Unknown'}</h3>
            <p className="text-sm text-gray-600">Admission: {student.admission_number}</p>
            {student.email && <p className="text-sm text-gray-600">{student.email}</p>}
            {student.class_name && (
              <p className="text-sm text-gray-600">
                {student.class_name} {student.arm_name && `- ${student.arm_name}`}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => {
                console.log('View student:', student.id)
                // Navigate to student detail page
                router.push(`/teacher/student/${student.id}`)
              }}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition"
            >
              View
            </button>
            <button 
              onClick={() => {
                console.log('View scores for student:', student.id)
                // Navigate to subject score sheet with student selected
                router.push(`/teacher/subject-score-sheet?student_id=${student.id}`)
              }}
              className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded cursor-pointer transition"
            >
              Scores
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">👥 Student Management</h1>
            <p className="text-orange-100 mt-1">{school?.name}</p>
          </div>
          <Link href="/teacher/dashboard">
            <button className="px-6 py-2 bg-white hover:bg-gray-100 text-orange-600 rounded-lg font-semibold transition">
              ← Back to Dashboard
            </button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Class Students */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b bg-blue-50">
              <h2 className="text-xl font-bold text-gray-900">📚 Class Students</h2>
              <p className="text-sm text-gray-600">Students in your managed classes</p>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Select Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a class...</option>
                  {managedClasses.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.classes?.name} - {cls.arms?.name}
                    </option>
                  ))}
                </select>
              </div>

              {loadingClass ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading students...</p>
                </div>
              ) : classStudents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No students in this class</p>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by name or admission #..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {classStudents.map((student) => (
                      <StudentCard key={student.id} student={student} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subject Students */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b bg-purple-50">
              <h2 className="text-xl font-bold text-gray-900">📖 Subject Students</h2>
              <p className="text-sm text-gray-600">Students taking your subject(s)</p>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Select Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choose a subject...</option>
                  {taughtSubjects.map((subject: any) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subjects?.name}
                    </option>
                  ))}
                </select>
              </div>

              {loadingSubject ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading students...</p>
                </div>
              ) : subjectStudents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No students taking this subject</p>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by name or admission #..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {subjectStudents.map((student) => (
                      <StudentCard key={student.id} student={student} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Class Students</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{classStudents.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Subject Students</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{subjectStudents.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Unique Students</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {new Set([...classStudents, ...subjectStudents].map(s => s.id)).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
