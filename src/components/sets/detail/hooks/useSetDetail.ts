import { useState, useEffect, useCallback } from "react"
import type {
  SetDetailDTO,
  SetDetailVM,
  ApiErrorDTO,
} from "../../../../types"

type UseSetDetailResult = {
  data: SetDetailVM | undefined
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching a single set's details with all its words.
 * Maps DTO to VM (snake_case → camelCase).
 */
export function useSetDetail(setId: string): UseSetDetailResult {
  const [data, setData] = useState<SetDetailVM | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch set details from API
  const fetchSetDetail = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/sets/${setId}`)

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if unauthorized
          window.location.href = "/login"
          return
        }

        if (response.status === 404) {
          // Redirect to sets list if not found
          window.location.href = "/app/sets"
          return
        }

        const errorData: ApiErrorDTO = await response.json()
        throw new Error(errorData.error.message || "Failed to fetch set details")
      }

      const result: SetDetailDTO = await response.json()

      // Map DTO to VM (camelCase conversion)
      const mappedData: SetDetailVM = {
        id: result.id,
        name: result.name,
        level: result.level,
        words: result.words.map((word) => ({
          id: word.id,
          pl: word.pl,
          en: word.en,
        })),
        wordsCount: result.words_count,
        latestGeneration: result.latest_generation
          ? {
              id: result.latest_generation.id,
              occurredAt: result.latest_generation.occurred_at,
            }
          : null,
      }

      setData(mappedData)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      console.error("Error fetching set details:", err)
    } finally {
      setLoading(false)
    }
  }, [setId])

  // Initial fetch on mount
  useEffect(() => {
    fetchSetDetail()
  }, [fetchSetDetail])

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchSetDetail()
  }, [fetchSetDetail])

  return {
    data,
    loading,
    error,
    refetch,
  }
}

