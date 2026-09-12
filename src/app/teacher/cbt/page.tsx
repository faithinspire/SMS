'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CBTService } from '@/services/cbt.service'
import { TeacherService } from '@/services/teacher.service'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import CreateCBTForm from './CreateCBT'

interface Exam {
  id: string
  title: string
  description?: string
  examType: 'TEST' | 'EXAM'
  testNumber?: number
  startTime: string
  endTime: string
  durationMinutes: number
  totalMarks?: number
  passingPercentage?: number
  questionCount?: number
  createdAt: string
}

interface SubjectClass {
  subjectId: string
  subjectName: string
  classArmComboId: string
  className: string
}

export default function CBTExamsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)

  const [exams, setExams] = useState<Exam[]>([])
  const [selectedSubjectClass, setSelectedSubjectClass] = useState<SubjectClass | null>(null)
  const [subjectClasses, setSubjectClasses] = useState<SubjectClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser || currentUser.role !== 'TEACHER') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        // Load school data
        if (currentUser.school_id) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('*')
            .eq('id', currentUser.school_id)
            .single()
          setSchool(schoolData)
        }
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/landing')
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (user && school) {
      loadTeacherData()
    }
  }, [user, school])

  const loadTeacherData = async () => {
    try {
      if (!user || !school) return

      console.log('🔄 Loading teacher dashboard data...')
      const dashboardData = await TeacherService.getTeacherDashboard(user.id, school.id)
      console.log('✅ Dashboard data:', dashboardData)

      const classes: SubjectClass[] = []

      if (dashboardData.taughtSubjects) {
        for (const subject of dashboardData.taughtSubjects) {
          const classInfo = subject.class_arm_combos
          classes.push({
            subjectId: subject.subjects.id,
            subjectName: subject.subjects.name,
            classArmComboId: classInfo.id,
            className: `${classInfo.classes?.name || 'Unknown'} - ${classInfo.arms?.name || 'Unknown'}`,
          })
          console.log('✅ Added class-subject combo:', {
            subject: subject.subjects.name,
            class: classInfo.classes?.name,
            arm: classInfo.arms?.name,
          })
        }
      }

      console.log('✅ Total subject-class combos:', classes.length)
      setSubjectClasses(classes)
      
      if (classes.length > 0) {
        console.log('✅ Setting first combo as selected')
        setSelectedSubjectClass(classes[0])
        await loadExams(classes[0])
      } else {
        console.warn('⚠️ No subject-class combos found for this teacher')
        setError('No subjects or classes assigned to you. Contact your administrator.')
      }

      setLoading(false)
    } catch (err) {
      console.error('❌ Error loading teacher data:', err)
      setError('Failed to load exam data')
      setLoading(false)
    }
  }

  const loadExams = async (subjectClass: SubjectClass) => {
    try {
      if (!user || !school) return

      const schoolId = school.id || (user as any).school_id

      const examsData = await CBTService.getExamsForTeacher(
        schoolId,
        subjectClass.subjectId,
        subjectClass.classArmComboId
      )

      setExams(examsData as any)
    } catch (err) {
      console.error('Error loading exams:', err)
      setError('Failed to load exams')
    }
  }

  const handleSubjectClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = subjectClasses.find(sc => sc.subjectId === e.target.value)
    if (selected) {
      setSelectedSubjectClass(selected)
      await loadExams(selected)
    }
  }

  const handleManageQuestions = (examId: string) => {
    router.push(`/teacher/cbt/${examId}/questions`)
  }

  const handleViewResults = (examId: string) => {
    router.push(`/teacher/cbt/${examId}/results`)
  }

  const isExamActive = (exam: Exam) => {
    const now = new Date()
    const start = new Date(exam.startTime)
    const end = new Date(exam.endTime)
    return now >= start && now <= end
  }

  const isExamUpcoming = (exam: Exam) => {
    const now = new Date()
    const start = new Date(exam.startTime)
    return now < start
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading exams...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💻 CBT Exams</h1>
          <p className="text-gray-600">Create and manage computer-based tests</p>
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
            <option value="">Select Subject - Class</option>
            {subjectClasses.length > 0 ? (
              subjectClasses.map(sc => (
                <option key={`${sc.subjectId}-${sc.classArmComboId}`} value={sc.subjectId}>
                  {sc.subjectName} - {sc.className}
                </option>
              ))
            ) : (
              <option disabled>Loading classes...</option>
            )}
          </select>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create Exam
          </button>
        </div>

        {/* Create Form - Use CreateCBTForm Component */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
            <CreateCBTForm />
          </div>
        )}
            <h2 className="text-xl font-semibold mb-4">Create New Exam</h2>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Term 1 Test 1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Type *
                  </label>
                  <select
                    value={formData.examType}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        examType: e.target.value as 'TEST' | 'EXAM',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TEST">Test</option>
                    <option value="EXAM">Exam</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the exam"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({ ...formData, durationMinutes: e.target.value })}
                    placeholder="e.g., 60"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={formData.totalMarks}
                    onChange={e => setFormData({ ...formData, totalMarks: e.target.value })}
                    placeholder="e.g., 100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passing Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={formData.passingPercentage}
                    onChange={e => setFormData({ ...formData, passingPercentage: e.target.value })}
                    placeholder="e.g., 50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {formData.examType === 'TEST' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Number
                    </label>
                    <select
                      value={formData.testNumber}
                      onChange={e => setFormData({ ...formData, testNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="1">Test 1</option>
                      <option value="2">Test 2</option>
                      <option value="3">Test 3</option>
                      <option value="4">Test 4</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {submitting ? 'Creating...' : 'Create Exam'}
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

        {/* Exams List */}
        <div className="space-y-4">
          {exams.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600">
              No exams yet. Create your first exam to get started!
            </div>
          ) : (
            exams.map(exam => {
              const active = isExamActive(exam)
              const upcoming = isExamUpcoming(exam)

              return (
                <div
                  key={exam.id}
                  className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {exam.examType === 'TEST' && exam.testNumber
                          ? `Test ${exam.testNumber}`
                          : exam.examType}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {active && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          🟢 Active
                        </span>
                      )}
                      {upcoming && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          ⏰ Upcoming
                        </span>
                      )}
                      {!active && !upcoming && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {exam.description && (
                    <p className="text-gray-700 mb-3 line-clamp-2">{exam.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">Duration</p>
                      <p className="text-sm font-semibold text-gray-900">{exam.durationMinutes}m</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">Total Marks</p>
                      <p className="text-sm font-semibold text-gray-900">{exam.totalMarks || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">Questions</p>
                      <p className="text-sm font-semibold text-gray-900">{exam.questionCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">Pass %</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {exam.passingPercentage || '-'}%
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    {new Date(exam.startTime).toLocaleString()} to{' '}
                    {new Date(exam.endTime).toLocaleString()}
                  </p>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleManageQuestions(exam.id)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                      {exam.questionCount ? 'Edit' : 'Add'} Questions
                    </button>
                    <button
                      onClick={() => handleViewResults(exam.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                      View Results
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
