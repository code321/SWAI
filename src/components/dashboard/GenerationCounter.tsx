import type { UsageDailyDTO } from "@/types";

interface GenerationCounterProps {
  usage: UsageDailyDTO;
}

/**
 * GenerationCounter component
 *
 * Displays generation quota in format "X/10 generacji dzisiaj"
 * Changes color to red when remaining === 0
 */
export function GenerationCounter({ usage }: GenerationCounterProps) {
  const isLimitReached = usage.remaining === 0;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isLimitReached ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
      }`}
    >
      {/* Sparkles icon */}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      </svg>

      <span className="font-semibold">
        {usage.remaining}/{usage.limit} generacji dzisiaj
      </span>
    </div>
  );
}
