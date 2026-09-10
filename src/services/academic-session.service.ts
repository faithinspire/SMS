/**
 * AcademicSessionService
 * 
 * Centralized service for managing academic sessions and terms.
 * REPLACES: Direct Supabase queries for academic_sessions and academic_terms
 * 
 * This service is the single source of truth for:
 * - Academic session retrieval and creation
 * - Term retrieval for a given session
 * - Current/active session detection
 * 
 * All components should use this service instead of making direct Supabase calls.
 */

export interface AcademicSession {
  id: string
  session_year: string // e.g., "2026/2027"
  start_year: number
  end_year: number
  is_active: boolean
  created_at: string
}

export interface Term {
  id: string
  term_name: string // e.g., "First Term"
  term_order: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface SessionWithTerms extends AcademicSession {
  terms?: Term[]
}

class AcademicSessionServiceImpl {
  private baseUrl = ''

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  }

  /**
   * Get all academic sessions for a school.
   * 
   * @param schoolId - School UUID
   * @returns Array of academic sessions, ordered by start_year DESC (newest first)
   */
  async getAcademicSessions(schoolId: string): Promise<AcademicSession[]> {
    if (!schoolId) {
      throw new Error('School ID is required to fetch academic sessions')
    }

    try {
      const response = await fetch(
        `/api/sessions?schoolId=${encodeURIComponent(schoolId)}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch sessions: ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.sessions || []
    } catch (error) {
      console.error('[AcademicSessionService] getAcademicSessions error:', error)
      throw error
    }
  }

  /**
   * Get all terms for a specific academic session.
   * 
   * @param sessionId - Academic session UUID
   * @returns Array of terms, ordered by term_order (ASC: First → Second → Third)
   */
  async getTerms(sessionId: string): Promise<Term[]> {
    if (!sessionId) {
      throw new Error('Session ID is required to fetch terms')
    }

    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/terms`,
        { method: 'GET' }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch terms: ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.terms || []
    } catch (error) {
      console.error('[AcademicSessionService] getTerms error:', error)
      throw error
    }
  }

  /**
   * Get a specific academic session with all its terms.
   * 
   * @param sessionId - Academic session UUID
   * @returns Session with terms populated
   */
  async getSessionWithTerms(sessionId: string): Promise<SessionWithTerms | null> {
    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/terms`,
        { method: 'GET' }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data || null
    } catch (error) {
      console.error('[AcademicSessionService] getSessionWithTerms error:', error)
      return null
    }
  }

  /**
   * Get the currently active academic session for a school.
   * 
   * NOTE: This method requires active/is_current session records in database.
   * If no active session is found, returns the most recent session.
   * 
   * @param schoolId - School UUID
   * @returns Active or most recent academic session
   */
  async getCurrentAcademicSession(schoolId: string): Promise<AcademicSession | null> {
    try {
      const sessions = await this.getAcademicSessions(schoolId)

      if (sessions.length === 0) {
        return null
      }

      // First try to find is_active = true
      const activeSessions = sessions.filter((s) => s.is_active)
      if (activeSessions.length > 0) {
        return activeSessions[0]
      }

      // Fall back to first (most recent) session
      return sessions[0]
    } catch (error) {
      console.error('[AcademicSessionService] getCurrentAcademicSession error:', error)
      return null
    }
  }

  /**
   * Get terms for the current academic session.
   * 
   * @param schoolId - School UUID
   * @returns Array of terms from the current session
   */
  async getCurrentTerms(schoolId: string): Promise<Term[]> {
    try {
      const currentSession = await this.getCurrentAcademicSession(schoolId)

      if (!currentSession) {
        return []
      }

      return await this.getTerms(currentSession.id)
    } catch (error) {
      console.error('[AcademicSessionService] getCurrentTerms error:', error)
      return []
    }
  }

  /**
   * Create a new academic session.
   * 
   * Automatically generates First/Second/Third terms via database trigger.
   * 
   * @param schoolId - School UUID
   * @param startYear - Start year (e.g., 2029)
   * @param endYear - End year (optional, defaults to startYear + 1)
   * @param isActive - Mark as active (optional, defaults to false)
   * @returns Created session with auto-generated terms count
   */
  async createAcademicSession(
    schoolId: string,
    startYear: number,
    endYear?: number,
    isActive?: boolean
  ): Promise<{
    session_id: string
    session_year: string
    terms_auto_created: number
  }> {
    if (!schoolId || startYear === undefined) {
      throw new Error('School ID and start year are required')
    }

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          start_year: startYear,
          end_year: endYear,
          is_active: isActive || false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to create session: ${response.statusText}`
        )
      }

      const data = await response.json()
      return {
        session_id: data.session_id,
        session_year: data.session_year,
        terms_auto_created: data.terms_auto_created || 3,
      }
    } catch (error) {
      console.error('[AcademicSessionService] createAcademicSession error:', error)
      throw error
    }
  }

  /**
   * Find a session by session_year string (e.g., "2026/2027").
   * 
   * @param schoolId - School UUID
   * @param sessionYear - Session year string (e.g., "2026/2027")
   * @returns Matching session or null
   */
  async findSessionByYear(schoolId: string, sessionYear: string): Promise<AcademicSession | null> {
    try {
      const sessions = await this.getAcademicSessions(schoolId)
      return sessions.find((s) => s.session_year === sessionYear) || null
    } catch (error) {
      console.error('[AcademicSessionService] findSessionByYear error:', error)
      return null
    }
  }

  /**
   * Find a term by name within a session (e.g., "First Term").
   * 
   * @param sessionId - Academic session UUID
   * @param termName - Term name (e.g., "First Term")
   * @returns Matching term or null
   */
  async findTermByName(sessionId: string, termName: string): Promise<Term | null> {
    try {
      const terms = await this.getTerms(sessionId)
      return terms.find((t) => t.term_name === termName) || null
    } catch (error) {
      console.error('[AcademicSessionService] findTermByName error:', error)
      return null
    }
  }
}

// Export singleton instance
export const AcademicSessionService = new AcademicSessionServiceImpl()
