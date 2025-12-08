import { useState, useEffect, useCallback } from 'react';
import type { DashboardDTO } from '@/types';

/**
 * Custom hook for dashboard data management
 * 
 * Provides optional SWR-like functionality for revalidating dashboard data
 * Currently just wraps the initial SSR data, but can be extended for client-side updates
 * 
 * @param initial - Initial dashboard data from SSR
 * @returns Dashboard data and revalidation function
 */
export function useDashboardData(initial: DashboardDTO) {
  const [data, setData] = useState<DashboardDTO>(initial);
  const [isRevalidating, setIsRevalidating] = useState(false);

  /**
   * Revalidate dashboard data by fetching from API
   * Useful for refreshing data on focus or after mutations
   */
  const revalidate = useCallback(async () => {
    setIsRevalidating(true);

    try {
      const response = await fetch('/api/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to revalidate dashboard');
      }

      const newData = await response.json();
      setData(newData);
    } catch (error) {
      console.error('Error revalidating dashboard:', error);
      // Keep existing data on error
    } finally {
      setIsRevalidating(false);
    }
  }, []);

  /**
   * Optional: Auto-revalidate on window focus
   * Uncomment if needed for production
   */
  /*
  useEffect(() => {
    const handleFocus = () => {
      revalidate();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidate]);
  */

  return {
    data,
    isRevalidating,
    revalidate,
  };
}

