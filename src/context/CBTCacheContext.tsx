'use client'

import React, { createContext, useContext, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'

/**
 * CBT CACHE CONTEXT
 * 
 * Provides efficient caching of CBT exam data and questions.
 * Prevents redundant database queries for exam and question data.
 * 
 * Cache Strategy:
 * - Cache exam data by exam_id
 * - Cache questions by exam_id
 * - Cache options by question_id
 * - TTL: Session duration (cleared on new session)
 * - Manual invalidation not typically needed
 */

interface ExamData {
  id: string
  title: string
  subject_id: string
  subject_name: string
  duration_minutes: number
  total_marks: number
  passing_percentage: number
  start_time: string
  end_time: string
  school_id: string
}

interface Question {
  id: string
  question_text: string
  marks: number
  display_order: number
}

interface Option {
  id: string
  option_text: string
  is_correct: boolean
  question_id: string
  display_order: number
}

interface CBTCacheContextType {
  // Get exam with subject name (checks cache first)
  getExam: (examId: string, schoolId: string) => Promise<ExamData | null>
  
  // Get questions for exam (checks cache first)
  getQuestions: (examId: string) => Promise<Question[] | null>
  
  // Get options for questions (checks cache first)
  getOptions: (questionIds: string[]) => Promise<Map<string, Option[]> | null>
  
  // Preload all exam data (call when entering exam)
  preloadExam: (examId: string, schoolId: string) => Promise<{
    exam: ExamData | null
    questions: Question[] | null
    options: Map<string, Option[]> | null
  }>
  
  // Invalidate cache (call on logout)
  invalidateCache: () => void
}

const CBTCacheContext = createContext<CBTCacheContextType | null>(null)

export const CBTCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Cache storage
  const examCacheRef = useRef<Map<string, ExamData>>(new Map())
  const questionsCacheRef = useRef<Map<string, Question[]>>(new Map())
  const optionsCacheRef = useRef<Map<string, Option[]>>(new Map())

  const getExam = useCallback(async (examId: string, schoolId: string): Promise<ExamData | null> => {
    try {
      // Check cache first
      if (examCacheRef.current.has(examId)) {
        console.log('📦 Exam cache hit for:', examId)
        return examCacheRef.current.get(examId) || null
      }

      console.log('📊 Exam cache miss, querying database for:', examId)

      const { data: examData, error } = await supabase
        .from('cbt_exams')
        .select(`
          id, title, subject_id, duration_minutes, total_marks,
          passing_percentage, start_time, end_time, school_id,
          subjects!inner (name)
        `)
        .eq('id', examId)
        .eq('school_id', schoolId)
        .single()

      if (error || !examData) {
        console.warn('Exam not found:', examId)
        return null
      }

      const exam: ExamData = {
        id: examData.id,
        title: examData.title,
        subject_id: examData.subject_id,
        subject_name: (examData.subjects as any)?.name || 'Unknown',
        duration_minutes: examData.duration_minutes,
        total_marks: examData.total_marks,
        passing_percentage: examData.passing_percentage,
        start_time: examData.start_time,
        end_time: examData.end_time,
        school_id: examData.school_id,
      }

      examCacheRef.current.set(examId, exam)
      console.log('✅ Exam cached:', examId)
      return exam
    } catch (err) {
      console.error('Error getting exam:', err)
      return null
    }
  }, [])

  const getQuestions = useCallback(async (examId: string): Promise<Question[] | null> => {
    try {
      // Check cache first
      if (questionsCacheRef.current.has(examId)) {
        console.log('📦 Questions cache hit for exam:', examId)
        return questionsCacheRef.current.get(examId) || null
      }

      console.log('📊 Questions cache miss, querying database for exam:', examId)

      const { data: questionsData, error } = await supabase
        .from('cbt_questions')
        .select('id, question_text, marks, display_order')
        .eq('cbt_exam_id', examId)
        .order('display_order', { ascending: true })

      if (error || !questionsData) {
        console.warn('No questions found for exam:', examId)
        return null
      }

      questionsCacheRef.current.set(examId, questionsData)
      console.log('✅ Questions cached for exam:', examId, 'Count:', questionsData.length)
      return questionsData
    } catch (err) {
      console.error('Error getting questions:', err)
      return null
    }
  }, [])

  const getOptions = useCallback(async (questionIds: string[]): Promise<Map<string, Option[]> | null> => {
    try {
      if (questionIds.length === 0) return new Map()

      // Check cache for all questions
      const uncachedIds: string[] = []
      const result = new Map<string, Option[]>()

      for (const qId of questionIds) {
        if (optionsCacheRef.current.has(qId)) {
          result.set(qId, optionsCacheRef.current.get(qId) || [])
        } else {
          uncachedIds.push(qId)
        }
      }

      if (uncachedIds.length === 0) {
        console.log('📦 Options cache hit for all questions')
        return result
      }

      console.log('📊 Options cache miss for', uncachedIds.length, 'questions, querying database')

      const { data: optionsData, error } = await supabase
        .from('cbt_options')
        .select('id, option_text, is_correct, question_id, display_order')
        .in('question_id', uncachedIds)
        .order('display_order', { ascending: true })

      if (error || !optionsData) {
        console.warn('No options found for questions')
        return result
      }

      // Group by question_id and cache
      optionsData.forEach((opt) => {
        if (!result.has(opt.question_id)) {
          result.set(opt.question_id, [])
        }
        result.get(opt.question_id)!.push(opt)
        optionsCacheRef.current.set(opt.question_id, result.get(opt.question_id)!)
      })

      console.log('✅ Options cached for', uncachedIds.length, 'questions')
      return result
    } catch (err) {
      console.error('Error getting options:', err)
      return null
    }
  }, [])

  const preloadExam = useCallback(
    async (examId: string, schoolId: string) => {
      console.log('🔄 Preloading all exam data for:', examId)

      const [exam, questions] = await Promise.all([
        getExam(examId, schoolId),
        getQuestions(examId),
      ])

      let options: Map<string, Option[]> | null = null
      if (questions && questions.length > 0) {
        const questionIds = questions.map((q) => q.id)
        options = await getOptions(questionIds)
      }

      return { exam, questions, options }
    },
    [getExam, getQuestions, getOptions]
  )

  const invalidateCache = useCallback(() => {
    console.log('🗑️  Invalidating CBT cache')
    examCacheRef.current.clear()
    questionsCacheRef.current.clear()
    optionsCacheRef.current.clear()
  }, [])

  const value: CBTCacheContextType = {
    getExam,
    getQuestions,
    getOptions,
    preloadExam,
    invalidateCache,
  }

  return <CBTCacheContext.Provider value={value}>{children}</CBTCacheContext.Provider>
}

/**
 * Hook to use CBT cache in components
 * 
 * Example usage:
 * const { preloadExam } = useCBTCache()
 * const { exam, questions, options } = await preloadExam(examId, schoolId)
 */
export const useCBTCache = (): CBTCacheContextType => {
  const context = useContext(CBTCacheContext)
  if (!context) {
    throw new Error('useCBTCache must be used within CBTCacheProvider')
  }
  return context
}
