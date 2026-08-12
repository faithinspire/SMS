import jwt from 'jsonwebtoken'
import { JwtPayload, UserRole, User } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'

export function generateJwt(user: User, roles: UserRole[], expiresIn = '24h'): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    school_id: user.school_id,
    roles,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: 'school-management-saas',
  })
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'school-management-saas',
    })
    return decoded as JwtPayload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token)
    return decoded as JwtPayload
  } catch (error) {
    return null
  }
}

export function isJwtExpired(token: string): boolean {
  const decoded = decodeJwt(token)
  if (!decoded || !decoded.exp) return true

  const now = Math.floor(Date.now() / 1000)
  return decoded.exp < now
}

export function getJwtFromCookie(req: any): string | null {
  const authHeader = req.headers?.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Fallback to cookie
  const cookies = req.headers?.cookie || ''
  const tokenMatch = cookies.match(/auth_token=([^;]+)/)
  return tokenMatch ? tokenMatch[1] : null
}
