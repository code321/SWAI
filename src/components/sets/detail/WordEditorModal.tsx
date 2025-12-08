import { useState, useEffect } from "react"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { WordVM } from "../../../types"

// Validation schema
const wordFormSchema = z.object({
  pl: z
    .string()
    .min(1, "Słowo po polsku jest wymagane")
    .max(200, "Słowo po polsku jest za długie (max 200 znaków)"),
  en: z
    .string()
    .min(1, "Słowo po angielsku jest wymagane")
    .max(200, "Słowo po angielsku jest za długie (max 200 znaków)")
    .trim()
    .refine((val) => val.length > 0, "Słowo po angielsku nie może być puste"),
})

type WordFormValues = z.infer<typeof wordFormSchema>

type WordEditorModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: WordVM | null
  onSubmit: (values: WordFormValues, wordId?: string) => Promise<void>
}

/**
 * WordEditorModal component for creating and editing words.
 * Validates input using Zod schema and handles both create and edit modes.
 */
export function WordEditorModal({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
}: WordEditorModalProps) {
  const [formValues, setFormValues] = useState<WordFormValues>({
    pl: "",
    en: "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof WordFormValues, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or initialValues change
  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialValues) {
        setFormValues({
          pl: initialValues.pl,
          en: initialValues.en,
        })
      } else {
        setFormValues({ pl: "", en: "" })
      }
      setErrors({})
    }
  }, [open, mode, initialValues])

  // Handle input changes
  const handleChange = (field: keyof WordFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate form
    const result = wordFormSchema.safeParse(formValues)

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof WordFormValues, string>> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof WordFormValues] = err.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(result.data, initialValues?.id)
      onOpenChange(false)
    } catch (err) {
      console.error("Error submitting word:", err)
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Dodaj słówko" : "Edytuj słówko"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Wprowadź nowe słówko wraz z tłumaczeniem."
              : "Zaktualizuj słówko lub jego tłumaczenie."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Polish word field */}
            <div className="grid gap-2">
              <Label htmlFor="pl">
                Słowo po polsku <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pl"
                value={formValues.pl}
                onChange={(e) => handleChange("pl", e.target.value)}
                placeholder="np. kot"
                maxLength={200}
                disabled={isSubmitting}
                className={errors.pl ? "border-red-500" : ""}
              />
              {errors.pl && (
                <p className="text-sm text-red-500">{errors.pl}</p>
              )}
            </div>

            {/* English word field */}
            <div className="grid gap-2">
              <Label htmlFor="en">
                Słowo po angielsku <span className="text-red-500">*</span>
              </Label>
              <Input
                id="en"
                value={formValues.en}
                onChange={(e) => handleChange("en", e.target.value)}
                placeholder="np. cat"
                maxLength={200}
                disabled={isSubmitting}
                className={errors.en ? "border-red-500" : ""}
              />
              {errors.en && (
                <p className="text-sm text-red-500">{errors.en}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Zapisywanie..."
                : mode === "create"
                ? "Dodaj"
                : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

