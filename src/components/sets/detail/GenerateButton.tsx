import { GenerationStatus } from "../../../types"

type GenerateButtonProps = {
  status: GenerationStatus
  onGenerate: () => void
  onStartSession: () => void
  remainingGenerations: number
  wordsCount: number
}

/**
 * GenerateButton component handles generation and session start actions.
 * Displays different states: idle, loading, ready.
 */
export function GenerateButton({
  status,
  onGenerate,
  onStartSession,
  remainingGenerations,
  wordsCount,
}: GenerateButtonProps) {
  // Determine if button should be disabled
  const isDisabled =
    status === GenerationStatus.Loading ||
    wordsCount === 0 ||
    remainingGenerations === 0

  // Determine button label and action
  const getButtonConfig = () => {
    switch (status) {
      case GenerationStatus.Loading:
        return {
          label: "Generowanie...",
          onClick: () => {},
          className: "bg-blue-400 cursor-not-allowed",
        }
      case GenerationStatus.Ready:
        return {
          label: "Rozpocznij sesję",
          onClick: onStartSession,
          className: "bg-green-600 hover:bg-green-700",
        }
      case GenerationStatus.Idle:
      default:
        return {
          label: "Generuj zdania",
          onClick: onGenerate,
          className: "bg-blue-600 hover:bg-blue-700",
        }
    }
  }

  const config = getButtonConfig()

  return (
    <div className="mt-4 sm:mt-6 flex flex-col items-stretch sm:items-start gap-2">
      <button
        onClick={config.onClick}
        disabled={isDisabled}
        className={`
          ${config.className}
          w-full sm:w-auto
          text-white font-medium py-3 px-6 rounded-lg
          transition-colors flex items-center justify-center gap-2
          disabled:bg-gray-300 disabled:cursor-not-allowed
        `}
      >
        {status === GenerationStatus.Loading && (
          <svg
            className="animate-spin h-5 w-5 text-white"
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
        )}
        {config.label}
      </button>

      {/* Display remaining generations */}
      <p className="text-xs sm:text-sm text-gray-500">
        Pozostało generacji dzisiaj: <span className="font-medium">{remainingGenerations}</span>
      </p>

      {/* Display warnings */}
      {wordsCount === 0 && (
        <p className="text-xs sm:text-sm text-red-600">
          Dodaj słówka, aby móc wygenerować zdania.
        </p>
      )}
      {remainingGenerations === 0 && wordsCount > 0 && (
        <p className="text-xs sm:text-sm text-red-600">
          Wykorzystano dzienny limit generacji. Spróbuj jutro.
        </p>
      )}
    </div>
  )
}

