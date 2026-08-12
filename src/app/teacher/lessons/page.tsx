'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LessonService } from '@/services/lesson.service'
import { TeacherService } from '@/services/teacher.service'
import { useAuth } from '@/lib/useAuth'

interface Lesson {
  id: string
  title: string
  content: string
  publishedAt?: string
  createdAt: string
  attachments?: Array<{ name: string; url: string; type: string }>
}

interface SubjectClass {
  subjectId: string
  subjectName: string
  classArmComboId: string
  className: string
}

export default function LessonsPage() {
  const router = useRouter()
  const { user, school } = useAuth()

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedSubjectClass, setSelectedSubjectClass] = useState<SubjectClass | null>(null)
  const [subjectClasses, setSubjectClasses] = useState<SubjectClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
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
        await loadLessons(classes[0])
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading teacher data:', err)
      setError('Failed to load lesson data')
      setLoading(false)
    }
  }

  const loadLessons = async (subjectClass: SubjectClass) => {
    try {
      if (!school) return

      const lessonsData = await LessonService.getLessonNotesForTeacher(
        school.id,
        subjectClass.subjectId,
        subjectClass.classArmComboId
      )

      setLessons(lessonsData as any)
    } catch (err) {
      console.error('Error loading lessons:', err)
      setError('Failed to load lessons')
    }
  }

  const handleSubjectClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = subjectClasses.find(sc => sc.subjectId === e.target.value)
    if (selected) {
      setSelectedSubjectClass(selected)
      await loadLessons(selected)
    }
  }

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubjectClass || !school || !user) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await LessonService.createLessonNote({
        schoolId: school.id,
        subjectId: selectedSubjectClass.subjectId,
        classArmComboId: selectedSubjectClass.classArmComboId,
        createdBy: user.id,
        title: formData.title,
        content: formData.content,
      })

      setSuccess('Lesson created successfully!')
      setFormData({ title: '', content: '' })
      setShowForm(false)

      await loadLessons(selectedSubjectClass)
    } catch (err: any) {
      setError(err.message || 'Failed to create lesson')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = async (lessonId: string) => {
    if (!school) return

    try {
      await LessonService.publishLesson(lessonId, school.id)
      setSuccess('Lesson published successfully!')
      if (selectedSubjectClass) {
        await loadLessons(selectedSubjectClass)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish lesson')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading lessons...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Lesson Notes</h1>
          <p className="text-gray-600">Create and manage lesson notes for your classes</p>
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
            + Create Lesson
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Create New Lesson</h2>
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter lesson title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter lesson content or notes"
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {submitting ? 'Creating...' : 'Create Lesson'}
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

        {/* Lessons List */}
        <div className="space-y-4">
          {lessons.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600">
              No lessons yet. Create your first lesson to get started!
            </div>
          ) : (
            lessons.map(lesson => (
              <div
                key={lesson.id}
                className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{lesson.title}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      lesson.publishedAt
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {lesson.publishedAt ? '✓ Published' : 'Draft'}
                  </span>
                </div>

                <p className="text-gray-700 mb-3 line-clamp-3">{lesson.content}</p>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Created: {new Date(lesson.createdAt).toLocaleDateString()}
                  </p>
                  {!lesson.publishedAt && (
                    <button
                      onClick={() => handlePublish(lesson.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
