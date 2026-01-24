import { useState, useEffect, useCallback } from "react";
import type { UsageDailyDTO } from "../../../../types";

interface UseUsageDataReturn {
  data: UsageDailyDTO | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching daily usage data.
 * Returns daily generation limit, used count, and remaining count.
 *
 * @returns Object with usage data, loading state, error state, and refetch function
 */
export function useUsageData(): UseUsageDataReturn {
  const [data, setData] = useState<UsageDailyDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/usage/daily");

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          window.location.href = "/";
          return;
        }
        throw new Error("Nie udało się pobrać danych o zużyciu");
      }

      const usageData: UsageDailyDTO = await response.json();
      setData(usageData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
      setError(errorMessage);
      console.error("Error fetching usage data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  return {
    data,
    loading,
    error,
    refetch: fetchUsageData,
  };
}
