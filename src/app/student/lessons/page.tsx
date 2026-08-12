'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { LessonService } from '@/services/lesson.service'
import { StudentService } from '@/services/student.service'
import { useAuth } from '@/lib/useAuth'

interface Lesson {
  id: string
  title: string
  content: string
  publishedAt?: string
  createdAt: string
  attachments?: Array<{ name: string; url: string; type: string }>
}

interface StudentSubject {
  subjectId: string
  subjectName: string
  teacherName: string
}

export default function StudentLessonsPage() {
  const router = useRouter()
  const { user, school } = useAuth()

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedSubject, setSelectedSubject] = useState<StudentSubject | null>(null)
  const [subjects, setSubjects] = useState<StudentSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!user || user.role !== 'STUDENT' || !school) {
      router.push('/landing')
      return
    }

    loadStudentData()
  }, [user, school])

  const loadStudentData = async () => {
    try {
      if (!user || !school) return

      // Get student record
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .eq('school_id', school.id)
        .single()

      if (studentError || !students) {
        throw new Error('Student record not found')
      }

      const studentId = students.id

      // Get student's subjects with teacher info
      const { data: studentSubjects, error: subjectsError } = await supabase
        .from('student_subjects')
        .select('subject_id, subject_teacher_id, subjects(id, name), users(full_name)')
        .eq('student_id', studentId)
        .eq('school_id', school.id)

      if (subjectsError) throw subjectsError

      const subjectsList: StudentSubject[] =
        studentSubjects?.map((ss: any) => ({
          subjectId: ss.subject_id,
          subjectName: ss.subjects?.name || 'Unknown',
          teacherName: ss.users?.full_name || 'Unknown Teacher',
        })) || []

      setSubjects(subjectsList)
      if (subjectsList.length > 0) {
        setSelectedSubject(subjectsList[0])
        await loadLessons(studentId, subjectsList[0].subjectId)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading student data:', err)
      setError('Failed to load lessons')
      setLoading(false)
    }
  }

  const loadLessons = async (studentId: string, subjectId: string) => {
    try {
      if (!school) return

      const lessonsData = await LessonService.getLessonNotesForStudent(
        studentId,
        subjectId,
        school.id
      )

      setLessons(lessonsData as any)
    } catch (err) {
      console.error('Error loading lessons:', err)
      setError('Failed to load lessons')
    }
  }

  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = subjects.find(s => s.subjectId === e.target.value)
    if (selected) {
      setSelectedSubject(selected)

      // Get student id again to load lessons
      if (user && school) {
        try {
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .eq('school_id', school.id)
            .single()

          if (students) {
            await loadLessons(students.id, selected.subjectId)
          }
        } catch (err) {
          console.error('Error changing subject:', err)
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading lessons...</div>
      </div>
    )
  }

  if (!subjects || subjects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">No subjects enrolled</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Lesson Notes</h1>
          <p className="text-gray-600">View lesson notes from your teachers</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Subject Selector */}
        {subjects.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject:</label>
            <select
              value={selectedSubject?.subjectId || ''}
              onChange={handleSubjectChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {subjects.map(subject => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.subjectName} - {subject.teacherName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Lessons List */}
        <div className="space-y-4">
          {lessons.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600">
              No lesson notes available yet for this subject.
            </div>
          ) : (
            lessons.map(lesson => (
              <div
                key={lesson.id}
                className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{lesson.title}</h3>

                <div className="prose prose-sm max-w-none mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{lesson.content}</p>
                </div>

                {lesson.attachments && lesson.attachments.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {lesson.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                        >
                          📎 {att.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Published: {new Date(lesson.publishedAt || lesson.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
