import { useEffect, useRef } from "react"

type UseIntersectionObserverOptions = {
  onIntersect: () => void
  enabled?: boolean
  threshold?: number
  rootMargin?: string
}

/**
 * Custom hook for implementing infinite scroll with IntersectionObserver.
 * Calls onIntersect callback when the target element becomes visible.
 */
export function useIntersectionObserver({
  onIntersect,
  enabled = true,
  threshold = 0.1,
  rootMargin = "100px",
}: UseIntersectionObserverOptions) {
  const targetRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const target = targetRef.current
    if (!target) {
      return
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          onIntersect()
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    // Start observing
    observerRef.current.observe(target)

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [enabled, onIntersect, threshold, rootMargin])

  return targetRef
}

