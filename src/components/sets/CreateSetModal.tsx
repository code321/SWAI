import { useState, useCallback } from "react";
import type { CEFRLevel } from "../../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface CreateSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface WordInput {
  pl: string;
  en: string;
}

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const MAX_WORDS = 5;

/**
 * Modal component for creating a new set with 1-5 words.
 * Validates input and calls the API to create the set.
 */
export function CreateSetModal({ open, onOpenChange, onSuccess }: CreateSetModalProps) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [words, setWords] = useState<WordInput[]>([{ pl: "", en: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddWord = useCallback(() => {
    if (words.length < MAX_WORDS) {
      setWords([...words, { pl: "", en: "" }]);
    }
  }, [words]);

  const handleRemoveWord = useCallback(
    (index: number) => {
      if (words.length > 1) {
        setWords(words.filter((_, i) => i !== index));
      }
    },
    [words]
  );

  const handleWordChange = useCallback(
    (index: number, field: "pl" | "en", value: string) => {
      const newWords = [...words];
      newWords[index][field] = value;
      setWords(newWords);
    },
    [words]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!name.trim()) {
      setError("Nazwa zestawu jest wymagana");
      return;
    }

    const validWords = words.filter((w) => w.pl.trim() && w.en.trim());
    if (validWords.length === 0) {
      setError("Dodaj przynajmniej jedno słówko");
      return;
    }

    setLoading(true);

    try {
      // Get user timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await fetch("/api/sets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          level,
          timezone,
          words: validWords,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error codes
        if (errorData.error?.code === "DUPLICATE_NAME") {
          throw new Error("Zestaw o tej nazwie już istnieje");
        }

        if (errorData.error?.code === "DUPLICATE_ENGLISH_WORD") {
          throw new Error("Nie można dodać dwóch takich samych angielskich słówek");
        }

        throw new Error(errorData.error?.message || "Nie udało się utworzyć zestawu");
      }

      // Success - reset form and close modal
      setName("");
      setLevel("A1");
      setWords([{ pl: "", en: "" }]);
      onOpenChange(false);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating set:", error);
      setError(error instanceof Error ? error.message : "Wystąpił błąd podczas tworzenia zestawu");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setName("");
    setLevel("A1");
    setWords([{ pl: "", en: "" }]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Utwórz nowy zestaw</DialogTitle>
          <DialogDescription>Dodaj nazwę, wybierz poziom CEFR i wprowadź od 1 do 5 słówek</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Set Name */}
          <div className="space-y-2">
            <Label htmlFor="set-name">Nazwa zestawu *</Label>
            <Input
              id="set-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Zwierzęta, Podróże..."
              maxLength={100}
              disabled={loading}
              required
            />
          </div>

          {/* CEFR Level */}
          <div className="space-y-2">
            <Label htmlFor="set-level">Poziom CEFR *</Label>
            <select
              id="set-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as CEFRLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
              required
            >
              {CEFR_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Words */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Słówka *</Label>
              <span className="text-sm text-gray-500">
                {words.length} / {MAX_WORDS}
              </span>
            </div>

            <div className="space-y-3">
              {words.map((word, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={word.pl}
                      onChange={(e) => handleWordChange(index, "pl", e.target.value)}
                      placeholder="Polski"
                      maxLength={200}
                      disabled={loading}
                      required
                    />
                    <Input
                      value={word.en}
                      onChange={(e) => handleWordChange(index, "en", e.target.value)}
                      placeholder="Angielski"
                      maxLength={200}
                      disabled={loading}
                      required
                    />
                  </div>
                  {words.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => handleRemoveWord(index)}
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      disabled={loading}
                      aria-label="Usuń słówko"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {words.length < MAX_WORDS && (
              <Button type="button" onClick={handleAddWord} variant="outline" className="w-full" disabled={loading}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Dodaj słówko
              </Button>
            )}
          </div>

          {/* Error Message */}
          {error && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">{error}</div>}

          {/* Form Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Tworzenie..." : "Utwórz zestaw"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
