'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { TeacherService } from '@/services/teacher.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

interface Teacher {
  id: string
  user_id: string
  full_name: string
  email: string
  photo_url?: string
}

interface Class {
  id: string
  name: string
}

interface ClassArm {
  id: string
  class_id: string
  classes: { name: string }
  arms: { name: string }
}

interface Subject {
  id: string
  name: string
}

interface TeacherAssignment {
  teacher_id: string
  teacher_name: string
  managed_class_id?: string
  managed_class_name?: string
  taught_subjects: Array<{
    subject_id: string
    subject_name: string
    class_arm_combo_id: string
    class_name: string
  }>
}

export default function TeacherAssignmentPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<any>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classArmCombos, setClassArmCombos] = useState<ClassArm[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  // Assignment state
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [selectedClassAsTeacher, setSelectedClassAsTeacher] = useState<string>('')
  const [selectedSubjectsForTeacher, setSelectedSubjectsForTeacher] = useState<
    Array<{ subject_id: string; class_arm_combo_id: string }>
  >([])
  
  const [assignmentTab, setAssignmentTab] = useState<'class' | 'subject'>('class')
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.school_id) {
        // Load school
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()
        setSchool(schoolData)

        // Load teachers (users with role TEACHER)
        const { data: teacherData } = await supabase
          .from('users')
          .select('id, full_name, email, photo_url')
          .eq('school_id', currentUser.school_id)
          .eq('role', 'TEACHER')
          .order('full_name', { ascending: true })
        setTeachers(teacherData || [])

        // Load class-arm combos
        const { data: classData } = await supabase
          .from('class_arm_combos')
          .select(`
            id,
            class_id,
            classes (name),
            arms (name)
          `)
          .eq('school_id', currentUser.school_id)
          .order('classes(name)', { ascending: true })
        setClassArmCombos(classData || [])

        // Load subjects
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('school_id', currentUser.school_id)
          .order('name', { ascending: true })
        setSubjects(subjectData || [])

        // Load current assignments
        await loadAssignments(currentUser.school_id)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async (schoolId: string) => {
    try {
      // Get class assignments
      const { data: classAssignments } = await supabase
        .from('class_arm_combos')
        .select(`
          id,
          class_teacher_id,
          classes (name),
          arms (name),
          users!class_arm_combos_class_teacher_id_fkey (
            id,
            full_name
          )
        `)
        .eq('school_id', schoolId)
        .not('class_teacher_id', 'is', null)

      // Get subject assignments
      const { data: subjectAssignments } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          id,
          teacher_id,
          subject_id,
          class_arm_combo_id,
          subjects (name),
          class_arm_combos (
            classes (name),
            arms (name)
          ),
          users:teacher_id (
            id,
            full_name
          )
        `)
        .eq('school_id', schoolId)

      // Group by teacher
      const assignmentMap: Record<string, TeacherAssignment> = {}

      classAssignments?.forEach((cls: any) => {
        const teacherId = cls.class_teacher_id
        const teacherName = cls.users?.full_name || 'Unknown'

        if (!assignmentMap[teacherId]) {
          assignmentMap[teacherId] = {
            teacher_id: teacherId,
            teacher_name: teacherName,
            taught_subjects: [],
          }
        }

        assignmentMap[teacherId].managed_class_id = cls.id
        assignmentMap[teacherId].managed_class_name = `${cls.classes?.name} - ${cls.arms?.name}`
      })

      subjectAssignments?.forEach((assignment: any) => {
        const teacherId = assignment.teacher_id
        const teacherName = assignment.users?.full_name || 'Unknown'

        if (!assignmentMap[teacherId]) {
          assignmentMap[teacherId] = {
            teacher_id: teacherId,
            teacher_name: teacherName,
            taught_subjects: [],
          }
        }

        assignmentMap[teacherId].taught_subjects.push({
          subject_id: assignment.subject_id,
          subject_name: assignment.subjects?.name,
          class_arm_combo_id: assignment.class_arm_combo_id,
          class_name: `${assignment.class_arm_combos?.classes?.name} - ${assignment.class_arm_combos?.arms?.name}`,
        })
      })

      setAssignments(Object.values(assignmentMap))
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const handleAssignClass = async () => {
    if (!selectedTeacher || !selectedClassAsTeacher) {
      setError('Please select both teacher and class')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await TeacherService.assignClassToTeacher(selectedTeacher, selectedClassAsTeacher)
      setSuccess('Class assigned to teacher successfully!')
      setSelectedTeacher('')
      setSelectedClassAsTeacher('')
      await loadAssignments(school.id)
    } catch (error: any) {
      setError(error.message || 'Failed to assign class')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddSubjectAssignment = () => {
    if (!selectedTeacher || !selectedClassAsTeacher) {
      setError('Please select teacher and class first')
      return
    }

    // Find available subjects not yet assigned
    const assignedSubjectsInClass = assignments
      .find(a => a.teacher_id === selectedTeacher)
      ?.taught_subjects.filter(s => s.class_arm_combo_id === selectedClassAsTeacher)
      .map(s => s.subject_id) || []

    const availableSubjects = subjects.filter(
      s => !assignedSubjectsInClass.includes(s.id)
    )

    if (availableSubjects.length === 0) {
      setError('All subjects are already assigned to this teacher in this class')
      return
    }
  }

  const handleAssignSubject = async (subjectId: string) => {
    if (!selectedTeacher || !selectedClassAsTeacher) {
      setError('Please select teacher and class')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await TeacherService.assignSubjects(selectedTeacher, school.id, [
        { subjectId, classArmComboId: selectedClassAsTeacher },
      ])
      setSuccess('Subject assigned to teacher successfully!')
      await loadAssignments(school.id)
    } catch (error: any) {
      setError(error.message || 'Failed to assign subject')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teacher assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">👨‍🏫 Teacher Assignments</h1>
            <p className="text-purple-100 mt-1">{school?.name}</p>
          </div>
          <Link href="/school-admin/staff">
            <button className="px-6 py-2 bg-white hover:bg-gray-100 text-purple-600 rounded-lg font-semibold transition">
              ← Back to Staff
            </button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✅ {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Assignment Form */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Assign Teacher</h2>

            {/* Select Teacher */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Select Teacher *</label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Tab Selection */}
            <div className="flex gap-4 mb-6 border-b">
              <button
                onClick={() => setAssignmentTab('class')}
                className={`px-4 py-2 font-semibold transition-all ${
                  assignmentTab === 'class'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600'
                }`}
              >
                🏫 Class Teacher
              </button>
              <button
                onClick={() => setAssignmentTab('subject')}
                className={`px-4 py-2 font-semibold transition-all ${
                  assignmentTab === 'subject'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600'
                }`}
              >
                📖 Subject Teacher
              </button>
            </div>

            {/* Class Assignment */}
            {assignmentTab === 'class' && (
              <>
                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-2">Select Class *</label>
                  <select
                    value={selectedClassAsTeacher}
                    onChange={(e) => setSelectedClassAsTeacher(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Select Class --</option>
                    {classArmCombos.map((classArm) => (
                      <option key={classArm.id} value={classArm.id}>
                        {classArm.classes?.name} - {classArm.arms?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAssignClass}
                  disabled={submitting || !selectedTeacher || !selectedClassAsTeacher}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign as Class Teacher'}
                </button>
              </>
            )}

            {/* Subject Assignment */}
            {assignmentTab === 'subject' && (
              <>
                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-2">Select Class *</label>
                  <select
                    value={selectedClassAsTeacher}
                    onChange={(e) => setSelectedClassAsTeacher(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Select Class --</option>
                    {classArmCombos.map((classArm) => (
                      <option key={classArm.id} value={classArm.id}>
                        {classArm.classes?.name} - {classArm.arms?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-3">Select Subjects *</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {subjects.map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => handleAssignSubject(subject.id)}
                        disabled={submitting || !selectedTeacher || !selectedClassAsTeacher}
                        className="w-full text-left px-4 py-2 border border-purple-300 rounded-lg hover:bg-purple-50 transition disabled:opacity-50"
                      >
                        + {subject.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Current Assignments */}
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Assignments</h2>

            {assignments.length === 0 ? (
              <p className="text-gray-600">No assignments yet</p>
            ) : (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {assignments.map((assignment) => (
                  <div key={assignment.teacher_id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-2">{assignment.teacher_name}</h4>

                    {assignment.managed_class_id && (
                      <div className="mb-3 p-2 bg-purple-50 rounded">
                        <p className="text-sm text-gray-600">
                          🏫 <strong>Class Teacher:</strong> {assignment.managed_class_name}
                        </p>
                      </div>
                    )}

                    {assignment.taught_subjects.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">📖 Teaching Subjects:</p>
                        <div className="space-y-1">
                          {assignment.taught_subjects.map((subj, idx) => (
                            <div key={idx} className="text-sm text-gray-600 pl-4">
                              • {subj.subject_name} ({subj.class_name})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!assignment.managed_class_id && assignment.taught_subjects.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No assignments</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
