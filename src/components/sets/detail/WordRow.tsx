import type { WordVM } from "../../../types";

interface WordRowProps {
  word: WordVM;
  onEdit: (word: WordVM) => void;
  onDelete: (wordId: string) => void;
  disabled?: boolean;
}

/**
 * WordRow component displays a single word with edit/delete actions.
 */
export function WordRow({ word, onEdit, onDelete, disabled }: WordRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 py-3 px-3 sm:px-4 hover:bg-gray-50 transition-colors gap-3 sm:gap-0">
      <div className="flex flex-col sm:flex-row flex-1 gap-3 sm:gap-8">
        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-sm text-gray-500">Polski</span>
          <p className="text-gray-900 font-medium break-words">{word.pl}</p>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-sm text-gray-500">English</span>
          <p className="text-gray-900 font-medium break-words">{word.en}</p>
        </div>
      </div>
      <div className="flex gap-3 sm:gap-2 self-start sm:self-auto">
        <button
          onClick={() => onEdit(word)}
          disabled={disabled}
          className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium px-2 py-1"
        >
          Edytuj
        </button>
        <button
          onClick={() => onDelete(word.id)}
          disabled={disabled}
          className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium px-2 py-1"
        >
          Usuń
        </button>
      </div>
    </div>
  );
}
