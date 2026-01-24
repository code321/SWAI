import { useState, useCallback } from "react";
import type { WordVM, WordsAddResponseDTO, WordUpdateResponseDTO, WordDeleteResponseDTO } from "../../../../types";

interface WordFormValues {
  pl: string;
  en: string;
}

interface UseWordMutationsReturn {
  addWords: (setId: string, words: WordFormValues[]) => Promise<WordsAddResponseDTO>;
  updateWord: (setId: string, wordId: string, data: Partial<WordFormValues>) => Promise<WordUpdateResponseDTO>;
  deleteWord: (setId: string, wordId: string) => Promise<WordDeleteResponseDTO>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for word CRUD operations.
 * Handles adding, updating, and deleting words in a set.
 *
 * @returns Object with mutation functions, loading state, and error state
 */
export function useWordMutations(): UseWordMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add words to a set
  const addWords = useCallback(async (setId: string, words: WordFormValues[]): Promise<WordsAddResponseDTO> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sets/${setId}/words`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ words }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 409) {
          throw new Error("Słówko o takim tłumaczeniu już istnieje w zestawie");
        } else if (response.status === 422) {
          throw new Error(errorData.error?.message || "Nieprawidłowe dane wejściowe");
        } else if (response.status === 404) {
          throw new Error("Zestaw nie istnieje");
        } else {
          throw new Error("Nie udało się dodać słówek");
        }
      }

      const data: WordsAddResponseDTO = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update a word
  const updateWord = useCallback(
    async (setId: string, wordId: string, data: Partial<WordFormValues>): Promise<WordUpdateResponseDTO> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sets/${setId}/words/${wordId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 409) {
            throw new Error("Słówko o takim tłumaczeniu już istnieje w zestawie");
          } else if (response.status === 422) {
            throw new Error(errorData.error?.message || "Nieprawidłowe dane wejściowe");
          } else if (response.status === 404) {
            throw new Error("Słówko nie istnieje");
          } else {
            throw new Error("Nie udało się zaktualizować słówka");
          }
        }

        const responseData: WordUpdateResponseDTO = await response.json();
        return responseData;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Delete a word
  const deleteWord = useCallback(async (setId: string, wordId: string): Promise<WordDeleteResponseDTO> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sets/${setId}/words/${wordId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          throw new Error("Słówko nie istnieje");
        } else {
          throw new Error("Nie udało się usunąć słówka");
        }
      }

      const data: WordDeleteResponseDTO = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    addWords,
    updateWord,
    deleteWord,
    isLoading,
    error,
  };
}
