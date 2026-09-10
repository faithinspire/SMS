'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface StudentHeaderInfo {
  school_name: string
  student_name: string
  admission_number: string
  class_name: string
  class_arm: string
  subject: string
  assessment_type: string
  term: string
}

interface Question {
  id: string
  question_text: string
  question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY' | 'ESSAY'
  marks: number
  display_order: number
  cbt_options?: Array<{
    id: string
    option_key?: string
    option_text: string
    display_order?: number
  }>
}

interface ExamInterfaceProps {
  submissionId: string
  examId: string
  studentHeader: StudentHeaderInfo
  questions: Question[]
  duration_minutes: number
  total_marks: number
  schoolId: string
}

export default function ExamInterface({
  submissionId,
  examId,
  studentHeader,
  questions,
  duration_minutes,
  total_marks,
  schoolId,
}: ExamInterfaceProps) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeRemaining, setTimeRemaining] = useState(duration_minutes * 60)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set())

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit when time expires
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Save current answer
  const handleAnswerChange = async (questionId: string, value: any) => {
    const question = questions[currentQuestionIndex]
    if (question.question_type === 'MULTIPLE_CHOICE' || question.question_type === 'TRUE_FALSE') {
      setAnswers({ ...answers, [questionId]: { selectedOptionId: value } })
    } else {
      setAnswers({ ...answers, [questionId]: { answerText: value } })
    }

    // Save to server
    try {
      const payload = {
        school_id: schoolId,
        submission_id: submissionId,
        question_id: questionId,
        ...(question.question_type === 'MULTIPLE_CHOICE' || question.question_type === 'TRUE_FALSE'
          ? { selected_option_id: value }
          : { answer_text: value }),
      }

      const response = await fetch('/api/student/cbt/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const newAnswered = new Set(answeredQuestions)
        newAnswered.add(questionId)
        setAnsweredQuestions(newAnswered)
      }
    } catch (error) {
      console.error('Error saving answer:', error)
    }
  }

  // Navigate questions
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleGoToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  // Auto-submit on time expire
  const handleAutoSubmit = async () => {
    toast.error('Time expired! Submitting exam...')
    await handleSubmit()
  }

  // Submit exam
  const handleSubmit = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to submit this examination? You cannot make changes after submission.'
    )
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/student/cbt/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          submission_id: submissionId,
          student_id: studentHeader.student_name, // Should be actual student_id
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Exam submitted! Score: ${data.result.score}/${data.result.total_marks}`)
        router.push(`/student/cbt/${examId}/results`)
      } else {
        toast.error(data.error || 'Failed to submit exam')
      }
    } catch (error) {
      console.error('Error submitting exam:', error)
      toast.error('Error submitting exam')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* ===== STUDENT HEADER (STICKY AT TOP) ===== */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 to-blue-700 text-white p-4 rounded-lg shadow-lg mb-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-sm font-semibold text-blue-100 mb-2 uppercase tracking-wide">
            {studentHeader.school_name}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-1">
              <div className="text-lg font-bold">
                Student: {studentHeader.student_name}
              </div>
              <div className="text-sm">
                Admission No: {studentHeader.admission_number}
              </div>
              <div className="text-sm">
                Class: {studentHeader.class_name} - {studentHeader.class_arm}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-1">
              <div className="text-sm">
                Subject: <span className="font-semibold">{studentHeader.subject}</span>
              </div>
              <div className="text-sm">
                Assessment: <span className="font-semibold">{studentHeader.assessment_type}</span>
              </div>
              <div className="text-sm">
                Term: {studentHeader.term}
              </div>
            </div>
          </div>

          {/* Timer bar */}
          <div className="mt-4 pt-4 border-t border-blue-500 flex justify-between items-center">
            <div className="text-sm font-semibold">
              Time Remaining: <span className="text-lg text-yellow-300">{formatTime(timeRemaining)}</span>
            </div>
            {timeRemaining < 300 && (
              <div className="text-sm text-red-300 font-bold animate-pulse">
                ⚠️ Less than 5 minutes remaining!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN EXAM CONTENT ===== */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel (Left) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-gray-800">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </h2>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-semibold">
                    {currentQuestion?.marks} mark(s)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-6 p-4 bg-gray-50 rounded border-l-4 border-blue-500">
                <p className="text-lg text-gray-700 leading-relaxed">
                  {currentQuestion?.question_text}
                </p>
              </div>

              {/* Answer Options */}
              <div className="mb-6">
                {currentQuestion?.question_type === 'MULTIPLE_CHOICE' && (
                  <div className="space-y-3">
                    {currentQuestion.cbt_options?.map((option) => (
                      <label key={option.id} className="flex items-center p-3 border rounded cursor-pointer hover:bg-blue-50 transition">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option.id}
                          checked={answers[currentQuestion.id]?.selectedOptionId === option.id}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <span className="ml-3 text-gray-700">{option.option_text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion?.question_type === 'TRUE_FALSE' && (
                  <div className="space-y-3">
                    {['TRUE', 'FALSE'].map((value) => (
                      <label key={value} className="flex items-center p-3 border rounded cursor-pointer hover:bg-blue-50 transition">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={value}
                          checked={answers[currentQuestion.id]?.selectedOptionId === value}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                        <span className="ml-3 text-gray-700 font-semibold">{value}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion?.question_type === 'THEORY' && (
                  <textarea
                    value={answers[currentQuestion.id]?.answerText || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={8}
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded font-semibold disabled:opacity-50 hover:bg-gray-400"
                >
                  ← Previous
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="px-6 py-2 bg-blue-600 text-white rounded font-semibold disabled:opacity-50 hover:bg-blue-700"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Question Navigation Panel (Right) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-4">Questions</h3>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => handleGoToQuestion(idx)}
                    className={`p-2 text-sm font-semibold rounded transition ${
                      idx === currentQuestionIndex
                        ? 'bg-blue-600 text-white'
                        : answeredQuestions.has(q.id)
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {answeredQuestions.has(q.id) ? '✓' : idx + 1}
                  </button>
                ))}
              </div>

              <div className="text-sm text-gray-600 mb-4">
                <div className="flex items-center mb-2">
                  <span className="w-3 h-3 bg-gray-100 rounded mr-2"></span> Not answered
                </div>
                <div className="flex items-center mb-2">
                  <span className="w-3 h-3 bg-green-100 rounded mr-2"></span> Answered
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-blue-600 rounded mr-2"></span> Current
                </div>
              </div>

              <hr className="my-4" />

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
              </button>

              <p className="text-xs text-gray-500 mt-2 text-center">
                Answered: {answeredQuestions.size} / {questions.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
