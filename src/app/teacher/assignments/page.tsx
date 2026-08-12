'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AssignmentService } from '@/services/assignment.service'
import { TeacherService } from '@/services/teacher.service'
import { useAuth } from '@/lib/useAuth'

interface Assignment {
  id: string
  title: string
  description: string
  dueDate?: string
  maxMarks?: number
  createdAt: string
  submissionCount?: number
  gradedCount?: number
}

interface SubjectClass {
  subjectId: string
  subjectName: string
  classArmComboId: string
  className: string
}

export default function AssignmentsPage() {
  const router = useRouter()
  const { user, school } = useAuth()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedSubjectClass, setSelectedSubjectClass] = useState<SubjectClass | null>(null)
  const [subjectClasses, setSubjectClasses] = useState<SubjectClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    dueDate: '',
    maxMarks: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  useEffect(() => {
    if (!user || user.role !== 'TEACHER' || !school) {
      router.push('/landing')
      return
    }

    loadTeacherData()
  }, [user, school])

  const loadTeacherData = async () => {
    try {
      if (!user || !school) return

      const dashboardData = await TeacherService.getTeacherDashboard(user.id, school.id)

      const classes: SubjectClass[] = []

      if (dashboardData.taughtSubjects) {
        for (const subject of dashboardData.taughtSubjects) {
          const classInfo = subject.class_arm_combos
          classes.push({
            subjectId: subject.subjects.id,
            subjectName: subject.subjects.name,
            classArmComboId: classInfo.id,
            className: `${classInfo.classes.name} ${classInfo.arms.name}`,
          })
        }
      }

      setSubjectClasses(classes)
      if (classes.length > 0) {
        setSelectedSubjectClass(classes[0])
        await loadAssignments(classes[0])
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading teacher data:', err)
      setError('Failed to load assignment data')
      setLoading(false)
    }
  }

  const loadAssignments = async (subjectClass: SubjectClass) => {
    try {
      if (!school) return

      const assignmentsData = await AssignmentService.getAssignmentsForTeacher(
        school.id,
        subjectClass.subjectId,
        subjectClass.classArmComboId
      )

      setAssignments(assignmentsData as any)
    } catch (err) {
      console.error('Error loading assignments:', err)
      setError('Failed to load assignments')
    }
  }

  const handleSubjectClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = subjectClasses.find(sc => sc.subjectId === e.target.value)
    if (selected) {
      setSelectedSubjectClass(selected)
      await loadAssignments(selected)
    }
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubjectClass || !school || !user) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await AssignmentService.createAssignment({
        schoolId: school.id,
        subjectId: selectedSubjectClass.subjectId,
        classArmComboId: selectedSubjectClass.classArmComboId,
        createdBy: user.id,
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        dueDate: formData.dueDate,
        maxMarks: formData.maxMarks ? parseFloat(formData.maxMarks) : undefined,
      })

      setSuccess('Assignment created successfully!')
      setFormData({
        title: '',
        description: '',
        instructions: '',
        dueDate: '',
        maxMarks: '',
      })
      setShowForm(false)

      await loadAssignments(selectedSubjectClass)
    } catch (err: any) {
      setError(err.message || 'Failed to create assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewSubmissions = (assignmentId: string) => {
    setSelectedAssignment(assignmentId)
    router.push(`/teacher/assignments/${assignmentId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading assignments...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">✏️ Assignments & Classwork</h1>
          <p className="text-gray-600">Create assignments and track student submissions</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Subject/Class Selector and Create Button */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <select
            value={selectedSubjectClass?.subjectId || ''}
            onChange={handleSubjectClassChange}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {subjectClasses.map(sc => (
              <option key={`${sc.subjectId}-${sc.classArmComboId}`} value={sc.subjectId}>
                {sc.subjectName} - {sc.className}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create Assignment
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Create New Assignment</h2>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Chapter 3 Exercises"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the assignment"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Detailed instructions for students"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Marks
                </label>
                <input
                  type="number"
                  value={formData.maxMarks}
                  onChange={e => setFormData({ ...formData, maxMarks: e.target.value })}
                  placeholder="e.g., 50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {submitting ? 'Creating...' : 'Create Assignment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600">
              No assignments yet. Create your first assignment to get started!
            </div>
          ) : (
            assignments.map(assignment => (
              <div
                key={assignment.id}
                className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{assignment.title}</h3>
                    {assignment.dueDate && (
                      <p className="text-sm text-gray-600 mt-1">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {assignment.maxMarks && (
                    <span className="text-lg font-semibold text-purple-600">
                      {assignment.maxMarks} marks
                    </span>
                  )}
                </div>

                <p className="text-gray-700 mb-4 line-clamp-2">{assignment.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Submissions</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {assignment.submissionCount || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Graded</p>
                    <p className="text-lg font-semibold text-green-600">
                      {assignment.gradedCount || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {(assignment.submissionCount || 0) - (assignment.gradedCount || 0)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleViewSubmissions(assignment.id)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  View Submissions ({assignment.submissionCount || 0})
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
