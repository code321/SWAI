import { useState, useEffect, useCallback } from "react";

interface SearchInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  debounceMs?: number;
}

/**
 * Search input with debouncing to avoid excessive API calls.
 * Enforces max 100 character limit as per validation rules.
 */
export function SearchInput({
  value = "",
  onChange,
  placeholder = "Szukaj zestawów...",
  debounceMs = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only call onChange if value actually changed
      if (localValue !== value) {
        onChange(localValue.trim() || undefined);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Enforce 100 character limit
    if (newValue.length <= 100) {
      setLocalValue(newValue);
    }
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange(undefined);
  }, [onChange]);

  return (
    <div className="relative">
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        aria-label="Wyszukaj zestawy"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Wyczyść wyszukiwanie"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
