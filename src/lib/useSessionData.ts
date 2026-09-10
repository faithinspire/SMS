'use client'

import { useState, useCallback } from 'react'
import { supabase } from './supabase-client'
import toast from 'react-hot-toast'

export interface Session {
  id: string
  name: string
  year: string
}

export interface Term {
  id: string
  name: string
  start_date: string
  end_date: string
}

export interface useSessionDataOptions {
  onError?: (error: any) => void
  onSuccess?: () => void
}

/**
 * Hook for manual session selection and data loading
 * Prevents automatic data fetching on page load
 * Requires explicit session/term selection by user
 */
export function useSessionData(options?: useSessionDataOptions) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load available sessions for current school
   * Queries academic_sessions table (CANONICAL)
   */
  const loadSessions = useCallback(async (schoolId: string) => {
    try {
      setLoading(true)
      setError(null)

      if (!schoolId) {
        throw new Error('School ID is required to load sessions')
      }

      // Query academic_sessions table via API (canonical source)
      const response = await fetch(`/api/sessions?schoolId=${schoolId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`)
      }
      
      const { sessions } = await response.json()

      // Transform to expected format
      const transformedSessions = (sessions || []).map((s: any) => ({
        id: s.id,
        name: s.session_year, // e.g., "2026/2027"
        year: s.start_year, // e.g., 2026 (now an INT from database)
      }))

      setSessions(transformedSessions)
      options?.onSuccess?.()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load sessions'
      setError(errorMsg)
      toast.error(errorMsg)
      options?.onError?.(err)
    } finally {
      setLoading(false)
    }
  }, [options])

  /**
   * Load terms for selected session
   * Queries academic_terms filtered by session_id (proper relational hierarchy)
   */
  const loadTerms = useCallback(async (sessionId: string) => {
    try {
      setLoading(true)
      setError(null)

      if (!sessionId) {
        throw new Error('Session ID is required to load terms')
      }

      // Fetch terms via API - properly filtered by session_id
      const response = await fetch(`/api/sessions/${sessionId}/terms`)
      if (!response.ok) {
        throw new Error(`Failed to fetch terms: ${response.statusText}`)
      }
      
      const { terms } = await response.json()

      // Transform to expected format, already sorted by term_order from API
      const transformedTerms = (terms || []).map((t: any) => ({
        id: t.id,
        name: t.term_name,
        start_date: t.start_date,
        end_date: t.end_date,
      }))

      setTerms(transformedTerms)
      setSelectedTerm('') // Reset term selection
      options?.onSuccess?.()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load terms'
      setError(errorMsg)
      toast.error(errorMsg)
      options?.onError?.(err)
    } finally {
      setLoading(false)
    }
  }, [options])

  /**
   * Validate that session and term are selected
   */
  const isSessionReady = useCallback(() => {
    if (!selectedSession || !selectedTerm) {
      toast.error('Please select both a Session and Term first')
      return false
    }
    return true
  }, [selectedSession, selectedTerm])

  return {
    sessions,
    terms,
    selectedSession,
    setSelectedSession,
    selectedTerm,
    setSelectedTerm,
    loading,
    error,
    loadSessions,
    loadTerms,
    isSessionReady,
  }
}
