'use client'

import React, { createContext, useContext, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'

/**
 * STUDENT CACHE CONTEXT
 * 
 * Provides efficient caching of student information across the application.
 * Prevents redundant database queries for student data.
 * 
 * Cache Strategy:
 * - Cache by user_id (fast lookup by UUID)
 * - Stores full student record with relationships
 * - No TTL (student data changes rarely during a session)
 * - Manual invalidation on logout
 */

interface StudentRecord {
  id: string
  user_id: string
  school_id: string
  admission_number: string
  user_full_name: string
  class_name: string
  class_arm_name: string
  class_level: number
}

interface StudentCacheContextType {
  // Get student record by user_id (checks cache first, then queries DB)
  getStudent: (userId: string) => Promise<StudentRecord | null>
  
  // Invalidate all cache (call on logout)
  invalidateCache: () => void
  
  // Preload student data (call after login)
  preloadStudent: (userId: string) => Promise<StudentRecord | null>
}

const StudentCacheContext = createContext<StudentCacheContextType | null>(null)

export const StudentCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simple in-memory cache with Map (user_id -> StudentRecord)
  const cacheRef = useRef<Map<string, StudentRecord>>(new Map())

  const getStudent = useCallback(async (userId: string): Promise<StudentRecord | null> => {
    try {
      // Check cache first
      if (cacheRef.current.has(userId)) {
        console.log('📦 Student cache hit for user:', userId)
        return cacheRef.current.get(userId) || null
      }

      console.log('📊 Student cache miss, querying database for user:', userId)

      // Query database with all relationships in a single optimized query
      const { data: studentData, error } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          school_id,
          admission_number,
          users!inner (full_name),
          class_arm_combos!inner (
            classes!inner (name, level),
            arms!inner (name)
          )
        `)
        .eq('user_id', userId)
        .single()

      if (error || !studentData) {
        console.warn('Student not found for user:', userId)
        return null
      }

      // Transform and cache the result
      const classArmCombo = (studentData.class_arm_combos as any)
      const student: StudentRecord = {
        id: studentData.id,
        user_id: studentData.user_id,
        school_id: studentData.school_id,
        admission_number: studentData.admission_number,
        user_full_name: (studentData.users as any)?.full_name || 'Unknown',
        class_name: classArmCombo?.classes?.name || 'N/A',
        class_arm_name: classArmCombo?.arms?.name || 'N/A',
        class_level: classArmCombo?.classes?.level || 0,
      }

      cacheRef.current.set(userId, student)
      console.log('✅ Student cached for user:', userId)
      return student
    } catch (err) {
      console.error('Error getting student:', err)
      return null
    }
  }, [])

  const preloadStudent = useCallback(async (userId: string): Promise<StudentRecord | null> => {
    console.log('🔄 Preloading student data for user:', userId)
    return getStudent(userId)
  }, [getStudent])

  const invalidateCache = useCallback(() => {
    console.log('🗑️  Invalidating student cache')
    cacheRef.current.clear()
  }, [])

  const value: StudentCacheContextType = {
    getStudent,
    preloadStudent,
    invalidateCache,
  }

  return (
    <StudentCacheContext.Provider value={value}>
      {children}
    </StudentCacheContext.Provider>
  )
}

/**
 * Hook to use student cache in components
 * 
 * Example usage:
 * const { getStudent } = useStudentCache()
 * const student = await getStudent(userId)
 */
export const useStudentCache = (): StudentCacheContextType => {
  const context = useContext(StudentCacheContext)
  if (!context) {
    throw new Error('useStudentCache must be used within StudentCacheProvider')
  }
  return context
}
