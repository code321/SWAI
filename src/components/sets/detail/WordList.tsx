import type { WordVM } from "../../../types"
import { WordRow } from "./WordRow"

type WordListProps = {
  words: WordVM[]
  onEdit: (word: WordVM) => void
  onDelete: (wordId: string) => void
  disabled?: boolean
}

/**
 * WordList component displays all words in the set.
 * Shows empty state when no words are present.
 */
export function WordList({ words, onEdit, onDelete, disabled }: WordListProps) {
  if (words.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-10 w-10 sm:h-12 sm:w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
          Brak słówek w zestawie
        </h3>
        <p className="text-sm sm:text-base text-gray-500">
          Dodaj pierwsze słówko, aby rozpocząć naukę.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-200 max-h-[60vh] overflow-y-auto">
        {words.map((word) => (
          <WordRow
            key={word.id}
            word={word}
            onEdit={onEdit}
            onDelete={onDelete}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

