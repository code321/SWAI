import { useState, useEffect } from "react";
import type { SessionDetailDTO } from "@/types";

interface UseSessionDetailResult {
  data: SessionDetailDTO | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch session details
 *
 * Fetches session data from the API including progress and sentences
 */
export function useSessionDetail(sessionId: string): UseSessionDetailResult {
  const [data, setData] = useState<SessionDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/sessions/${sessionId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Nie udało się załadować sesji");
        }

        const sessionData = await response.json();

        if (mounted) {
          setData(sessionData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Wystąpił błąd");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  return { data, isLoading, error };
}
