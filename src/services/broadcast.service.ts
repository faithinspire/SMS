/**
 * BroadcastService - Wraps API routes for broadcast messaging operations
 * Handles announcements and broadcast inbox management through API endpoints
 */

export interface BroadcastMessage {
  id: string
  title: string
  message: string
  sender: {
    id: string
    full_name: string
  }
  created_at: string
  read_at?: string
  read: boolean
}

export interface BroadcastPayload {
  school_id: string
  created_by: string
  title: string
  message: string
  scope: 'SCHOOL_WIDE' | 'CLASS' | 'ROLE'
  target_class_id?: string
  target_role?: string
}

export class BroadcastService {
  private static readonly BASE_URL = '/api'

  /**
   * Broadcast a message to school/class/role
   */
  static async broadcastMessage(payload: BroadcastPayload): Promise<{
    success: boolean
    announcement_id: string
    notifications_created: number
    message: string
  }> {
    try {
      const response = await fetch(`${this.BASE_URL}/announcements/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to broadcast message')
      }

      return await response.json()
    } catch (error) {
      console.error('Error broadcasting message:', error)
      throw error
    }
  }

  /**
   * Get broadcast inbox for a user
   */
  static async getInbox(
    schoolId: string,
    userId: string,
    unreadOnly: boolean = false
  ): Promise<{
    success: boolean
    count: number
    unread_count: number
    inbox: BroadcastMessage[]
  }> {
    try {
      const params = new URLSearchParams()
      params.append('school_id', schoolId)
      params.append('teacher_id', userId)
      if (unreadOnly) params.append('unread_only', 'true')

      const response = await fetch(
        `${this.BASE_URL}/teacher/broadcast-inbox?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to fetch inbox')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching broadcast inbox:', error)
      throw error
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(
    schoolId: string,
    userId: string,
    notificationId: string
  ): Promise<{
    success: boolean
    message: string
    updated: number
  }> {
    try {
      const response = await fetch(`${this.BASE_URL}/teacher/broadcast-inbox`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          teacher_id: userId,
          notification_id: notificationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to mark as read')
      }

      return await response.json()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(
    schoolId: string,
    userId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const response = await fetch(`${this.BASE_URL}/teacher/broadcast-inbox`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          teacher_id: userId,
          mark_all_as_read: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to mark all as read')
      }

      return await response.json()
    } catch (error) {
      console.error('Error marking all as read:', error)
      throw error
    }
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(schoolId: string, userId: string): Promise<number> {
    try {
      const result = await this.getInbox(schoolId, userId, true)
      return result.unread_count
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }
}
