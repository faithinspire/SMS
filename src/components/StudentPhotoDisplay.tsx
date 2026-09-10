'use client'

/**
 * StudentPhotoDisplay Component
 * 
 * Reliably displays student profile photos from Supabase public storage
 * - No complex error handling
 * - No fallback logic that breaks display
 * - Just renders the image directly
 */

interface StudentPhotoDisplayProps {
  photoUrl?: string | null
  studentName: string
  size?: 'sm' | 'md' | 'lg'
}

export default function StudentPhotoDisplay({
  photoUrl,
  studentName,
  size = 'md',
}: StudentPhotoDisplayProps) {
  // Size mappings
  const sizeMap = {
    sm: 'h-16 w-16 text-2xl',
    md: 'h-32 w-32 text-5xl',
    lg: 'h-48 w-48 text-7xl',
  }

  const sizeClass = sizeMap[size]

  // If we have a photo URL, display it directly
  // No error handling, no fallback logic
  if (photoUrl) {
    return (
      <div className="relative">
        <img
          src={photoUrl}
          alt={studentName}
          className={`${sizeClass} rounded-full object-cover border-4 border-pink-200 shadow-lg`}
        />
        <div className="absolute bottom-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          ✓ Photo
        </div>
      </div>
    )
  }

  // No photo: show emoji placeholder
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white shadow-lg`}
    >
      👨‍🎓
    </div>
  )
}
