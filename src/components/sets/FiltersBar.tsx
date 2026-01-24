import type { SetsQueryState, CEFRLevel } from "../../types";
import { SearchInput } from "./SearchInput";
import { LevelSelect } from "./LevelSelect";

interface FiltersBarProps {
  search?: string;
  level?: CEFRLevel;
  onChange: (partial: Partial<SetsQueryState>) => void;
}

/**
 * Filter bar component containing search and level filters.
 * Emits partial query updates to parent component.
 */
export function FiltersBar({ search, level, onChange }: FiltersBarProps) {
  const handleSearchChange = (value: string | undefined) => {
    onChange({ search: value });
  };

  const handleLevelChange = (value: CEFRLevel | undefined) => {
    onChange({ level: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search Input */}
        <div>
          <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-2">
            Wyszukaj
          </label>
          <SearchInput value={search} onChange={handleSearchChange} placeholder="Szukaj po nazwie zestawu..." />
        </div>

        {/* Level Filter */}
        <div>
          <label htmlFor="level-select" className="block text-sm font-medium text-gray-700 mb-2">
            Poziom CEFR
          </label>
          <LevelSelect value={level} onChange={handleLevelChange} />
        </div>
      </div>

      {/* Active Filters Indicator */}
      {(search || level) && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <span>Aktywne filtry:</span>
          {search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Szukaj: {search}
            </span>
          )}
          {level && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Poziom: {level}
            </span>
          )}
          <button
            onClick={() => onChange({ search: undefined, level: undefined })}
            className="text-blue-600 hover:text-blue-800 underline ml-2"
          >
            Wyczyść wszystkie
          </button>
        </div>
      )}
    </div>
  );
}
