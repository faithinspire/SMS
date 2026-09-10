'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Option {
  id?: string
  option_text: string
  is_correct: boolean
  option_key: string
}

interface Question {
  id?: string
  question_text: string
  question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY'
  marks: number
  options: Option[]
}

interface CBTExam {
  id: string
  title: string
  description?: string
  duration_minutes: number
  total_marks: number
  passing_percentage: number
  start_time: string
  end_time: string
  subject_id: string
  class_arm_combo_id: string
  exam_type: string
  questions?: Question[]
}

export default function EditCBTPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exam, setExam] = useState<CBTExam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState(false)
  const [newTitle, setNewTitle] = useState('')

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
      setNewTitle(examData.title)

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('cbt_questions')
        .select('*')
        .eq('cbt_exam_id', examId)
        .order('display_order', { ascending: true })

      if (questionsError) {
        console.error('Questions error:', questionsError)
      }

      if (questionsData && questionsData.length > 0) {
        // Load options for each question
        const { data: optionsData } = await supabase
          .from('cbt_options')
          .select('*')
          .in('question_id', questionsData.map((q) => q.id))
          .order('display_order', { ascending: true })

        const optionsMap = new Map<string, Option[]>()
        optionsData?.forEach((opt) => {
          if (!optionsMap.has(opt.question_id)) {
            optionsMap.set(opt.question_id, [])
          }
          optionsMap.get(opt.question_id)?.push({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            option_key: opt.option_key,
          })
        })

        const questionsWithOptions: Question[] = questionsData.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          marks: q.marks,
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

  const updateQuestion = async (questionId: string, updatedQuestion: Question) => {
    try {
      setSaving(true)

      // Update question
      const { error: updateError } = await supabase
        .from('cbt_questions')
        .update({
          question_text: updatedQuestion.question_text,
          marks: updatedQuestion.marks,
          question_type: updatedQuestion.question_type,
        })
        .eq('id', questionId)

      if (updateError) throw updateError

      // Update options
      for (const option of updatedQuestion.options) {
        if (option.id) {
          const { error: optError } = await supabase
            .from('cbt_options')
            .update({
              option_text: option.option_text,
              is_correct: option.is_correct,
            })
            .eq('id', option.id)

          if (optError) throw optError
        }
      }

      toast.success('Question updated successfully')
      setEditingQuestionId(null)
      await loadExam()
    } catch (err: any) {
      toast.error('Failed to update question: ' + err.message)
      console.error('Update error:', err)
    } finally {
      setSaving(false)
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      setSaving(true)

      // Delete options first
      await supabase.from('cbt_options').delete().eq('question_id', questionId)

      // Delete question
      const { error: deleteError } = await supabase
        .from('cbt_questions')
        .delete()
        .eq('id', questionId)

      if (deleteError) throw deleteError

      toast.success('Question deleted successfully')
      await loadExam()
    } catch (err: any) {
      toast.error('Failed to delete question: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateExamTitle = async () => {
    if (!exam || newTitle.trim() === exam.title) {
      setEditTitle(false)
      return
    }

    try {
      setSaving(true)

      const { error: updateError } = await supabase
        .from('cbt_exams')
        .update({ title: newTitle })
        .eq('id', exam.id)

      if (updateError) throw updateError

      toast.success('Exam title updated')
      setExam({ ...exam, title: newTitle })
      setEditTitle(false)
    } catch (err: any) {
      toast.error('Failed to update title: ' + err.message)
    } finally {
      setSaving(false)
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
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 pb-6 border-b">
            <div className="flex-1">
              {editTitle ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="flex-1 px-4 py-2 border border-blue-500 rounded-lg focus:outline-none"
                  />
                  <button
                    onClick={updateExamTitle}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditTitle(false)
                      setNewTitle(exam.title)
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
                  <button
                    onClick={() => setEditTitle(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit Title
                  </button>
                </div>
              )}
            </div>
            <Link href="/teacher/cbt-management">
              <button className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700">
                Back
              </button>
            </Link>
          </div>

          {/* Exam Details */}
          <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-600">Duration</label>
              <p className="text-lg font-semibold text-gray-900">{exam.duration_minutes} minutes</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Total Marks</label>
              <p className="text-lg font-semibold text-gray-900">{exam.total_marks}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Passing Percentage</label>
              <p className="text-lg font-semibold text-gray-900">{exam.passing_percentage}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Exam Type</label>
              <p className="text-lg font-semibold text-gray-900">{exam.exam_type}</p>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Questions ({questions.length})</h2>

            {questions.length === 0 ? (
              <p className="text-gray-600 p-4 bg-blue-50 rounded-lg">No questions added yet</p>
            ) : (
              questions.map((question, idx) => (
                <div
                  key={question.id}
                  className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition"
                >
                  {editingQuestionId === question.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={question.question_text}
                        onChange={(e) => {
                          const updated = [...questions]
                          updated[idx].question_text = e.target.value
                          setQuestions(updated)
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Question text"
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <select
                          value={question.question_type}
                          onChange={(e) => {
                            const updated = [...questions]
                            updated[idx].question_type = e.target.value as any
                            setQuestions(updated)
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                          <option value="TRUE_FALSE">True/False</option>
                          <option value="THEORY">Theory</option>
                        </select>

                        <input
                          type="number"
                          value={question.marks}
                          onChange={(e) => {
                            const updated = [...questions]
                            updated[idx].marks = parseInt(e.target.value) || 0
                            setQuestions(updated)
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Marks"
                          min="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Options</label>
                        {question.options.map((option, optIdx) => (
                          <div key={optIdx} className="flex gap-2">
                            <input
                              type="text"
                              value={option.option_text}
                              onChange={(e) => {
                                const updated = [...questions]
                                updated[idx].options[optIdx].option_text = e.target.value
                                setQuestions(updated)
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                              placeholder={`Option ${option.option_key}`}
                            />
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={option.is_correct}
                                onChange={(e) => {
                                  const updated = [...questions]
                                  updated[idx].options[optIdx].is_correct = e.target.checked
                                  setQuestions(updated)
                                }}
                              />
                              <span className="text-sm">Correct</span>
                            </label>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => updateQuestion(question.id!, question)}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingQuestionId(null)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium">Q{idx + 1}</p>
                          <p className="text-lg font-semibold text-gray-900 mt-1">
                            {question.question_text}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{question.marks} marks</p>
                          <p className="text-xs text-gray-500">{question.question_type}</p>
                        </div>
                      </div>

                      <div className="space-y-1 ml-4">
                        {question.options.map((opt) => (
                          <p key={opt.id} className="text-sm text-gray-700">
                            <span className="font-medium">{opt.option_key}.</span> {opt.option_text}
                            {opt.is_correct && (
                              <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                            )}
                          </p>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <button
                          onClick={() => setEditingQuestionId(question.id!)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteQuestion(question.id!)}
                          disabled={saving}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
