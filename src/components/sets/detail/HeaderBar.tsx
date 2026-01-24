import type { CEFRLevel } from "../../../types";

interface HeaderBarProps {
  name: string;
  level: CEFRLevel;
}

/**
 * HeaderBar component displays the set name and CEFR level badge.
 */
export function HeaderBar({ name, level }: HeaderBarProps) {
  // Map CEFR levels to colors
  const levelColors: Record<CEFRLevel, string> = {
    A1: "bg-green-100 text-green-800",
    A2: "bg-green-200 text-green-900",
    B1: "bg-blue-100 text-blue-800",
    B2: "bg-blue-200 text-blue-900",
    C1: "bg-purple-100 text-purple-800",
    C2: "bg-purple-200 text-purple-900",
  };

  return (
    <div className="mb-4 md:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{name}</h1>
        <span className={`self-start sm:self-auto rounded-full px-3 py-1 text-sm font-medium ${levelColors[level]}`}>
          {level}
        </span>
      </div>
    </div>
  );
}
