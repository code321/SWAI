import type { SetSummaryVM } from "../../types";
import { SetCard } from "./SetCard";

interface SetsGridProps {
  items: SetSummaryVM[];
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Responsive grid layout for displaying set cards.
 * Uses Tailwind grid with responsive breakpoints.
 */
export function SetsGrid({ items, onSelect, onEdit, onDelete }: SetsGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <SetCard key={item.id} item={item} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
