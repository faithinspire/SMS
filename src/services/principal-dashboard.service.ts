/**
 * PrincipalDashboardService - Wraps API route for principal dashboard data
 * Provides aggregated school statistics, classes, recent scores, and activity
 */

export interface SchoolInfo {
  name: string
  logo_url?: string
  type: string
}

export interface DashboardStats {
  total_classes: number
  total_students: number
  total_teachers: number
  total_staff: number
  average_attendance: number
  pending_lesson_notes: number
}

export interface ClassData {
  id: string
  name: string
  level: number
  arm_name: string
  teacher_name: string
  student_count: number
  average_score: number
  attendance_rate: number
}

export interface RecentScore {
  student_name: string
  subject: string
  score: number
  grade: string
  term: string
}

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
}

export interface RecentActivity {
  type: string
  description: string
  timestamp: string
}

export interface Dashboard {
  school_info: SchoolInfo
  stats: DashboardStats
  classes: ClassData[]
  recent_scores: RecentScore[]
  attendance_summary: AttendanceSummary
  recent_activity: RecentActivity[]
}

export class PrincipalDashboardService {
  private static readonly BASE_URL = '/api'

  /**
   * Get principal dashboard data
   */
  static async getDashboard(
    schoolId: string,
    principalId: string
  ): Promise<{
    success: boolean
    dashboard: Dashboard
  }> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('principal_id', principalId)

      const response = await fetch(
        `${this.BASE_URL}/principal/dashboard?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to fetch dashboard')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      throw error
    }
  }

  /**
   * Get dashboard stats only
   */
  static async getStats(
    schoolId: string,
    principalId: string
  ): Promise<DashboardStats> {
    try {
      const result = await this.getDashboard(schoolId, principalId)
      return result.dashboard.stats
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  }

  /**
   * Get class data only
   */
  static async getClasses(
    schoolId: string,
    principalId: string
  ): Promise<ClassData[]> {
    try {
      const result = await this.getDashboard(schoolId, principalId)
      return result.dashboard.classes
    } catch (error) {
      console.error('Error fetching classes:', error)
      throw error
    }
  }

  /**
   * Get recent scores only
   */
  static async getRecentScores(
    schoolId: string,
    principalId: string
  ): Promise<RecentScore[]> {
    try {
      const result = await this.getDashboard(schoolId, principalId)
      return result.dashboard.recent_scores
    } catch (error) {
      console.error('Error fetching recent scores:', error)
      throw error
    }
  }

  /**
   * Get attendance summary only
   */
  static async getAttendanceSummary(
    schoolId: string,
    principalId: string
  ): Promise<AttendanceSummary> {
    try {
      const result = await this.getDashboard(schoolId, principalId)
      return result.dashboard.attendance_summary
    } catch (error) {
      console.error('Error fetching attendance summary:', error)
      throw error
    }
  }

  /**
   * Get recent activity only
   */
  static async getRecentActivity(
    schoolId: string,
    principalId: string
  ): Promise<RecentActivity[]> {
    try {
      const result = await this.getDashboard(schoolId, principalId)
      return result.dashboard.recent_activity
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      throw error
    }
  }
}
