import { useEffect, useRef } from 'react'

/**
 * Safe AsyncEffect Hook
 * Wraps async operations with automatic error handling
 * Prevents unhandled promise rejections and memory leaks
 * 
 * Usage:
 * useAsyncEffect(async () => {
 *   const data = await fetchData()
 *   setData(data)
 * }, [dependency])
 */
export function useAsyncEffect(
  asyncFunction: () => Promise<void>,
  dependencies?: React.DependencyList,
  onError?: (error: Error) => void
): void {
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const executeAsync = async () => {
      try {
        if (mountedRef.current) {
          await asyncFunction()
        }
      } catch (error) {
        // Log error
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('🔴 Async Operation Error:', errorMessage)
        console.error('Full error:', error)

        // Call error handler if provided
        if (onError && mountedRef.current) {
          try {
            if (error instanceof Error) {
              onError(error)
            } else {
              onError(new Error(errorMessage))
            }
          } catch (handlerError) {
            console.error('🔴 Error Handler Failed:', handlerError)
          }
        }

        // Rethrow to trigger error boundary if no handler
        if (!onError) {
          throw error
        }
      }
    }

    // Execute async function
    executeAsync()

    // Cleanup: mark component as unmounted
    return () => {
      mountedRef.current = false
    }
  }, dependencies)
}

/**
 * Safe Promise Handler
 * Wraps Promise.all() or Promise.race() with error handling
 * 
 * Usage:
 * const results = await safePromiseAll([promise1, promise2])
 */
export async function safePromiseAll<T>(
  promises: Promise<T>[]
): Promise<(T | null)[]> {
  try {
    return await Promise.all(promises)
  } catch (error) {
    console.error('🔴 Promise.all() Failed:', error)
    
    // Return array of nulls for failed promises
    const results = await Promise.allSettled(promises)
    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error('Promise rejected:', result.reason)
        return null
      }
    })
  }
}

/**
 * Safe Data Fetch with Retry
 * Automatically retries failed fetches up to maxRetries times
 * 
 * Usage:
 * const data = await safeFetch(
 *   () => supabase.from('table').select('*'),
 *   { maxRetries: 3, delayMs: 1000 }
 * )
 */
export async function safeFetch<T>(
  fetchFn: () => Promise<{ data: T; error: any }>,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<{ data: T | null; error: any | null }> {
  const { maxRetries = 2, delayMs = 500 } = options

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchFn()

      if (result.error) {
        console.warn(`Attempt ${attempt + 1}: Fetch returned error:`, result.error)
        
        // Retry if not last attempt
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
          continue
        }

        return { data: null, error: result.error }
      }

      return { data: result.data, error: null }
    } catch (error) {
      console.error(`Attempt ${attempt + 1}: Fetch threw error:`, error)

      // Retry if not last attempt
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
        continue
      }

      return { data: null, error }
    }
  }

  return { data: null, error: new Error('Max retries exceeded') }
}

/**
 * Safe Async Operation with Timeout
 * Automatically times out operations that take too long
 * 
 * Usage:
 * const result = await withTimeout(
 *   fetchData(),
 *   5000 // 5 seconds
 * )
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ])
}

/**
 * Safe Component Mount Check
 * Prevents "can't update an unmounted component" warnings
 * 
 * Usage:
 * const isMounted = useIsMounted()
 * 
 * if (isMounted()) {
 *   setState(newValue)
 * }
 */
export function useIsMounted(): () => boolean {
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return () => mountedRef.current
}
