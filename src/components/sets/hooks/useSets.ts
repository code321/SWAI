import { useState, useEffect, useCallback } from "react";
import type { SetsQueryState, SetsPageVM, SetSummaryVM, SetsListResponseDTO, ApiErrorDTO } from "../../../types";

interface UseSetsResult {
  data: SetsPageVM | undefined;
  loading: boolean;
  error: string | null;
  loadNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing sets list with pagination.
 * Handles query state, loading states, and infinite scroll.
 */
export function useSets(query: SetsQueryState): UseSetsResult {
  const [data, setData] = useState<SetsPageVM | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build query string from query state
  const buildQueryString = useCallback((q: SetsQueryState): string => {
    const params = new URLSearchParams();

    if (q.search) params.set("search", q.search);
    if (q.level) params.set("level", q.level);
    if (q.cursor) params.set("cursor", q.cursor);
    params.set("limit", q.limit.toString());
    params.set("sort", q.sort);

    return params.toString();
  }, []);

  // Fetch sets from API
  const fetchSets = useCallback(
    async (q: SetsQueryState, append = false) => {
      try {
        if (!append) {
          setLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const queryString = buildQueryString(q);
        const response = await fetch(`/api/sets?${queryString}`);

        if (!response.ok) {
          if (response.status === 401) {
            // Redirect to login if unauthorized
            window.location.href = "/login";
            return;
          }

          const errorData: ApiErrorDTO = await response.json();
          throw new Error(errorData.error.message || "Failed to fetch sets");
        }

        const result: SetsListResponseDTO = await response.json();

        // Map DTO to VM (camelCase conversion)
        const mappedItems: SetSummaryVM[] = result.data.map((item) => ({
          id: item.id,
          name: item.name,
          level: item.level,
          wordsCount: item.words_count,
          createdAt: item.created_at,
          hasActiveSession: false, // Placeholder - would need separate endpoint
        }));

        const newData: SetsPageVM = {
          items: mappedItems,
          nextCursor: result.pagination.next_cursor || undefined,
          count: result.pagination.count,
        };

        if (append && data) {
          // Append to existing data for infinite scroll
          setData({
            items: [...data.items, ...newData.items],
            nextCursor: newData.nextCursor,
            count: newData.count,
          });
        } else {
          setData(newData);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        console.error("Error fetching sets:", err);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [buildQueryString, data]
  );

  // Initial fetch and refetch on query changes
  useEffect(() => {
    // Reset cursor when query changes (except cursor itself)
    const queryWithoutCursor = { ...query, cursor: undefined };
    fetchSets(queryWithoutCursor, false);
  }, [query.search, query.level, query.limit, query.sort]);

  // Load next page (infinite scroll)
  const loadNextPage = useCallback(async () => {
    if (!data?.nextCursor || isLoadingMore || loading) {
      return;
    }

    const nextQuery = { ...query, cursor: data.nextCursor };
    await fetchSets(nextQuery, true);
  }, [data, isLoadingMore, loading, query, fetchSets]);

  // Manual refetch
  const refetch = useCallback(async () => {
    await fetchSets({ ...query, cursor: undefined }, false);
  }, [query, fetchSets]);

  return {
    data,
    loading,
    error,
    loadNextPage,
    refetch,
  };
}
