import type { CEFRLevel } from "../../types"

type LevelSelectProps = {
  value?: CEFRLevel
  onChange: (value: CEFRLevel | undefined) => void
}

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"]

/**
 * Select component for filtering by CEFR level.
 * Includes "All levels" option to clear the filter.
 */
export function LevelSelect({ value, onChange }: LevelSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value
    onChange(newValue === "" ? undefined : (newValue as CEFRLevel))
  }

  return (
    <div className="relative">
      <select
        value={value || ""}
        onChange={handleChange}
        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow cursor-pointer"
        aria-label="Filtruj według poziomu CEFR"
      >
        <option value="">Wszystkie poziomy</option>
        {CEFR_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  )
}

