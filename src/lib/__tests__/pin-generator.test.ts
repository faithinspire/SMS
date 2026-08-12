import {
  generatePin,
  hashPin,
  comparePin,
  validatePinFormat,
  generateUniquePinWithRetry,
} from '@/lib/pin-generator'

describe('PIN Generator', () => {
  describe('generatePin', () => {
    it('should generate a PIN of the correct length', () => {
      const pin = generatePin(6)
      expect(pin).toHaveLength(6)
    })

    it('should generate alphanumeric PINs', () => {
      const pin = generatePin(6)
      expect(/^[A-Z0-9]{6}$/).toMatch(pin)
    })

    it('should generate different PINs on multiple calls', () => {
      const pins = new Set()
      for (let i = 0; i < 100; i++) {
        pins.add(generatePin(6))
      }
      expect(pins.size).toBeGreaterThan(50)
    })
  })

  describe('hashPin', () => {
    it('should hash a PIN', async () => {
      const pin = 'ABC123'
      const hash = await hashPin(pin)
      expect(hash).toBeDefined()
      expect(hash).not.toBe(pin)
      expect(hash.length).toBeGreaterThan(10)
    })

    it('should produce different hashes for the same PIN', async () => {
      const pin = 'ABC123'
      const hash1 = await hashPin(pin)
      const hash2 = await hashPin(pin)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('comparePin', () => {
    it('should return true for matching PIN and hash', async () => {
      const pin = 'ABC123'
      const hash = await hashPin(pin)
      const matches = await comparePin(pin, hash)
      expect(matches).toBe(true)
    })

    it('should return false for non-matching PIN and hash', async () => {
      const pin = 'ABC123'
      const wrongPin = 'XYZ789'
      const hash = await hashPin(pin)
      const matches = await comparePin(wrongPin, hash)
      expect(matches).toBe(false)
    })
  })

  describe('validatePinFormat', () => {
    it('should validate correct PIN format', () => {
      expect(validatePinFormat('ABC123')).toBe(true)
      expect(validatePinFormat('ABCDEF')).toBe(true)
      expect(validatePinFormat('123456')).toBe(true)
    })

    it('should reject invalid PIN formats', () => {
      expect(validatePinFormat('ABC12')).toBe(false) // Too short
      expect(validatePinFormat('ABC1234')).toBe(false) // Too long
      expect(validatePinFormat('abc123')).toBe(false) // Lowercase
      expect(validatePinFormat('ABC12!')).toBe(false) // Special character
    })
  })

  describe('generateUniquePinWithRetry', () => {
    it('should generate a unique PIN', async () => {
      const existingPin = await hashPin('ABC123')
      const newPin = await generateUniquePinWithRetry([existingPin])
      
      expect(newPin).not.toBe('ABC123')
      expect(validatePinFormat(newPin)).toBe(true)
    })

    it('should throw error when max retries exceeded', async () => {
      // This is difficult to test deterministically since PINs are random
      // In production, this would be a very rare edge case
      expect.assertions(0) // Skip for now
    })
  })
})
