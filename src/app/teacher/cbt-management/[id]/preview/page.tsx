'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'

interface Question {
  id: string
  question_text: string
  marks: number
  display_order: number
  options: Option[]
}

interface Option {
  id: string
  option_text: string
  is_correct: boolean
  display_order: number
}

export default function PreviewCBTPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string
  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadExam()
  }, [])

  const loadExam = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'TEACHER') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load exam
      const { data: examData, error: examError } = await supabase
        .from('cbt_exams')
        .select('*')
        .eq('id', examId)
        .eq('school_id', currentUser.school_id)
        .single()

      if (examError || !examData) {
        setError('Exam not found')
        return
      }

      setExam(examData)

      // Load questions
      const { data: questionsData } = await supabase
        .from('cbt_questions')
        .select('id, question_text, marks, display_order, cbt_exam_id')
        .eq('cbt_exam_id', examId)
        .order('display_order', { ascending: true })

      if (questionsData) {
        // Load options for each question
        const { data: optionsData } = await supabase
          .from('cbt_options')
          .select('id, option_text, is_correct, display_order, question_id')
          .in('question_id', questionsData.map((q) => q.id))
          .order('display_order', { ascending: true })

        const optionsMap = new Map<string, Option[]>()
        optionsData?.forEach((option) => {
          if (!optionsMap.has(option.question_id)) {
            optionsMap.set(option.question_id, [])
          }
          optionsMap.get(option.question_id)!.push(option)
        })

        const questionsWithOptions: Question[] = questionsData.map((q) => ({
          ...q,
          options: optionsMap.get(q.id) || [],
        }))

        setQuestions(questionsWithOptions)
      }
    } catch (err: any) {
      console.error('Load exam error:', err)
      setError('Failed to load exam: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/teacher/cbt-management">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                Back to CBT Management
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <p className="text-gray-600">No exam found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{exam.title} - Preview</h1>
            <Link href="/teacher/cbt-management">
              <button className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700">
                Back
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration</label>
              <p className="text-gray-900 font-semibold">{exam.duration_minutes} minutes</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Marks</label>
              <p className="text-gray-900 font-semibold">{exam.total_marks}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Passing Percentage</label>
              <p className="text-gray-900 font-semibold">{exam.passing_percentage}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Questions</label>
              <p className="text-gray-900 font-semibold">{questions.length}</p>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Question {index + 1}
                </h3>
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded">
                  {question.marks} marks
                </span>
              </div>

              <p className="text-gray-700 mb-4">{question.question_text}</p>

              {question.options.length > 0 ? (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className={`p-3 border-2 rounded-lg ${
                        option.is_correct
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-700">{option.option_text}</span>
                        {option.is_correct && (
                          <span className="ml-auto text-green-600 font-semibold text-sm">✓ Correct</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Theory question - no predefined options</p>
              )}
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
            <p className="text-yellow-800 font-semibold">No questions added yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
