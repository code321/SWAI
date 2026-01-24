import { useMemo } from "react";
import type { UsageDailyDTO } from "@/types";

/**
 * View Model for Generation Counter
 */
export interface GenerationCounterVM {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  isLimitReached: boolean;
  percentageUsed: number;
}

/**
 * Custom hook for generation counter logic
 *
 * Transforms UsageDailyDTO into a view model with computed properties
 *
 * @param usage - Usage data from API
 * @returns View model with computed properties
 */
export function useGenerationCounter(usage: UsageDailyDTO): GenerationCounterVM {
  return useMemo(() => {
    const percentageUsed = usage.limit > 0 ? Math.round((usage.used / usage.limit) * 100) : 0;

    return {
      limit: usage.limit,
      used: usage.used,
      remaining: usage.remaining,
      resetAt: usage.next_reset_at,
      isLimitReached: usage.remaining === 0,
      percentageUsed,
    };
  }, [usage]);
}
