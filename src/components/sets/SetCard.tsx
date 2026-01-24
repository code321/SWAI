import { useState } from "react";
import type { SetSummaryVM } from "../../types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "../ui/card";
import { Button } from "../ui/button";

interface SetCardProps {
  item: SetSummaryVM;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Card component displaying a single set with actions.
 * Uses shadcn/ui Card components for consistent styling.
 */
export function SetCard({ item, onSelect, onEdit, onDelete }: SetCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = () => {
    if (confirm(`Czy na pewno chcesz usunąć zestaw "${item.name}"?\n\nTa operacja jest nieodwracalna.`)) {
      onDelete(item.id);
    }
  };

  const handleSelect = () => {
    onSelect(item.id);
  };

  const handleEdit = () => {
    onEdit(item.id);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{item.name}</CardTitle>
        <CardDescription>Utworzono: {new Date(item.createdAt).toLocaleDateString("pl-PL")}</CardDescription>

        {/* Action Menu */}
        <CardAction>
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)} aria-label="Menu akcji">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </Button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                  <button
                    onClick={() => {
                      handleEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edytuj
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Usuń
                  </button>
                </div>
              </>
            )}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Level Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Poziom:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {item.level}
            </span>
          </div>

          {/* Words Count */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="text-sm text-gray-600">
              {item.wordsCount} {item.wordsCount === 1 ? "słówko" : "słówek"}
            </span>
          </div>

          {/* Active Session Indicator */}
          {item.hasActiveSession && (
            <div className="flex items-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">Aktywna sesja</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleSelect} className="w-full" variant={item.hasActiveSession ? "secondary" : "default"}>
          {item.hasActiveSession ? "Kontynuuj ćwiczenia" : "Rozpocznij ćwiczenia"}
        </Button>
      </CardFooter>
    </Card>
  );
}
