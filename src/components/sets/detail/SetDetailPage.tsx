import { useState, useCallback, useEffect } from "react"
import { useSetDetail, useWordMutations, useUsageData } from "./hooks"
import { HeaderBar } from "./HeaderBar"
import { WordList } from "./WordList"
import { GenerateButton } from "./GenerateButton"
import { WordEditorModal } from "./WordEditorModal"
import { GenerationStatus, type WordVM } from "../../../types"

type SetDetailPageProps = {
  setId: string
}

/**
 * SetDetailPage component displays a single set with all its words.
 * Handles word CRUD operations, generation, and session start.
 */
export function SetDetailPage({ setId }: SetDetailPageProps) {
  const { data, loading, error, refetch } = useSetDetail(setId)
  const { addWords, updateWord, deleteWord } = useWordMutations()
  const { data: usageData, refetch: refetchUsage } = useUsageData()

  // Local state for UI interactions
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(
    GenerationStatus.Idle
  )

  // Word editor modal state
  const [isWordModalOpen, setIsWordModalOpen] = useState(false)
  const [selectedWord, setSelectedWord] = useState<WordVM | null>(null)
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create")

  // Set generation status based on latest generation
  useEffect(() => {
    if (data?.latestGeneration) {
      setGenerationStatus(GenerationStatus.Ready)
    } else {
      setGenerationStatus(GenerationStatus.Idle)
    }
  }, [data?.latestGeneration])

  // Handle word edit
  const handleEditWord = useCallback((word: WordVM) => {
    setSelectedWord(word)
    setEditorMode("edit")
    setIsWordModalOpen(true)
  }, [])

  // Handle word delete
  const handleDeleteWord = useCallback(
    async (wordId: string) => {
      if (!confirm("Czy na pewno chcesz usunąć to słówko?")) {
        return
      }

      try {
        await deleteWord(setId, wordId)
        // Refetch data after deletion
        await refetch()
        alert("Słówko zostało usunięte")
      } catch (err) {
        console.error("Error deleting word:", err)
        alert(err instanceof Error ? err.message : "Nie udało się usunąć słówka")
      }
    },
    [setId, refetch, deleteWord]
  )

  // Handle word form submission (create or edit)
  const handleWordSubmit = useCallback(
    async (values: { pl: string; en: string }, wordId?: string) => {
      try {
        if (editorMode === "create") {
          // Add new word
          await addWords(setId, [values])
          alert("Słówko zostało dodane")
        } else if (wordId) {
          // Update existing word
          await updateWord(setId, wordId, values)
          alert("Słówko zostało zaktualizowane")
        }
        // Refetch data after mutation
        await refetch()
      } catch (err) {
        console.error("Error submitting word:", err)
        alert(err instanceof Error ? err.message : "Nie udało się zapisać słówka")
        throw err // Re-throw to prevent modal from closing
      }
    },
    [setId, editorMode, addWords, updateWord, refetch]
  )

  // Handle generation
  const handleGenerate = useCallback(async () => {
    setGenerationStatus(GenerationStatus.Loading)

    try {
      const response = await fetch(`/api/sets/${setId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: "gpt-4o-mini",
          temperature: 0.7,
          prompt_version: "v1",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate sentences")
      }

      // Refetch data to get latest generation
      await refetch()
      // Refetch usage to get updated remaining count
      await refetchUsage()

      // Set status to ready
      setGenerationStatus(GenerationStatus.Ready)

      // Show success message
      alert("Wygenerowano zdania! Możesz teraz rozpocząć sesję.")
    } catch (err) {
      console.error("Error generating sentences:", err)
      alert("Nie udało się wygenerować zdań")
      setGenerationStatus(GenerationStatus.Idle)
    }
  }, [setId, refetch, refetchUsage])

  // Handle session start
  const handleStartSession = useCallback(async () => {
    // Validate prerequisites
    if (!data?.latestGeneration) {
      alert("Nie można rozpocząć sesji: brak wygenerowanych zdań")
      return
    }

    if (data.wordsCount === 0) {
      alert("Nie można rozpocząć sesji: brak słówek w zestawie")
      return
    }

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          set_id: setId,
          generation_id: data.latestGeneration.id,
          mode: "translate",
        }),
      })

      // Handle different error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        switch (response.status) {
          case 401:
            alert("Sesja wygasła. Zaloguj się ponownie.")
            window.location.href = "/"
            return
          
          case 404:
            alert("Zestaw lub generacja nie została znaleziona. Odśwież stronę i spróbuj ponownie.")
            await refetch()
            return
          
          case 409:
            alert("Masz już aktywną sesję dla tego zestawu. Zakończ ją najpierw lub kontynuuj.")
            // Could redirect to active session here if we had that info
            return
          
          case 422:
            alert("Brak wygenerowanych zdań dla tego zestawu. Wygeneruj zdania ponownie.")
            setGenerationStatus(GenerationStatus.Idle)
            return
          
          case 400:
            alert(
              errorData.error?.message || 
              "Nieprawidłowe dane. Spróbuj ponownie."
            )
            return
          
          default:
            alert("Wystąpił błąd podczas tworzenia sesji. Spróbuj ponownie później.")
            return
        }
      }

      const result = await response.json()

      // Redirect to session page
      // Note: /app/sessions/:id page doesn't exist yet - will be implemented in future
      window.location.href = `/app/sessions/${result.id}`
    } catch (err) {
      console.error("Error starting session:", err)
      alert(
        err instanceof Error 
          ? `Błąd: ${err.message}` 
          : "Nie udało się rozpocząć sesji. Sprawdź połączenie z internetem."
      )
    }
  }, [setId, data, refetch, setGenerationStatus])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm sm:text-base text-gray-600">Ładowanie zestawu...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg
              className="h-10 w-10 sm:h-12 sm:w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            Wystąpił błąd
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  // No data state
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <p className="text-sm sm:text-base text-gray-600">Nie znaleziono zestawu</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <HeaderBar name={data.name} level={data.level} />

      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm sm:text-base text-gray-600">
          Słówek w zestawie: <span className="font-medium">{data.wordsCount}</span>
        </p>
        <button
          onClick={() => {
            setSelectedWord(null)
            setEditorMode("create")
            setIsWordModalOpen(true)
          }}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          + Dodaj słówko
        </button>
      </div>

      <WordList
        words={data.words}
        onEdit={handleEditWord}
        onDelete={handleDeleteWord}
      />

      <GenerateButton
        status={generationStatus}
        onGenerate={handleGenerate}
        onStartSession={handleStartSession}
        remainingGenerations={usageData?.remaining ?? 0}
        wordsCount={data.wordsCount}
      />

      <WordEditorModal
        open={isWordModalOpen}
        onOpenChange={setIsWordModalOpen}
        mode={editorMode}
        initialValues={selectedWord}
        onSubmit={handleWordSubmit}
      />
    </div>
  )
}

