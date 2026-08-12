import crypto from 'crypto'
import bcrypt from 'bcrypt'

/**
 * Generate a random PIN
 * @param length - PIN length (default 6)
 * @returns Random alphanumeric PIN
 */
export function generatePin(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let pin = ''
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, characters.length)
    pin += characters[randomIndex]
  }
  
  return pin
}

/**
 * Hash a PIN using bcrypt
 * @param pin - Plain text PIN
 * @returns Hashed PIN
 */
export async function hashPin(pin: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(pin, saltRounds)
}

/**
 * Compare PIN with hash
 * @param pin - Plain text PIN
 * @param hash - Hashed PIN
 * @returns true if PIN matches hash
 */
export async function comparePin(pin: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(pin, hash)
  } catch (error) {
    console.error('PIN comparison error:', error)
    return false
  }
}

/**
 * Validate PIN format
 * @param pin - PIN to validate
 * @returns true if PIN is valid format
 */
export function validatePinFormat(pin: string): boolean {
  // PIN should be 6 alphanumeric characters
  const pinRegex = /^[A-Z0-9]{6}$/
  return pinRegex.test(pin)
}

/**
 * Generate unique PIN (check against database)
 * @param existingPins - Array of existing hashed PINs
 * @returns Unique PIN
 */
export async function generateUniquePinWithRetry(
  existingPins: string[],
  maxRetries: number = 5
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const newPin = generatePin()
    
    // Check if PIN already exists
    let pinExists = false
    for (const existingPin of existingPins) {
      const matches = await comparePin(newPin, existingPin)
      if (matches) {
        pinExists = true
        break
      }
    }
    
    if (!pinExists) {
      return newPin
    }
  }
  
  throw new Error('Failed to generate unique PIN after max retries')
}
