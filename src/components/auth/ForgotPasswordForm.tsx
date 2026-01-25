import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

/**
 * ForgotPasswordForm component
 *
 * Handles password recovery email sending
 * Validates email and calls the /api/auth/recover endpoint
 * Shows success message without revealing if account exists (security)
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Basic validation
    if (!email.trim()) {
      setError("Adres email jest wymagany");
      return;
    }

    // Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Podaj poprawny adres email");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        throw new Error(data.error?.message || "Nie udało się wysłać linku do resetowania hasła");
      }

      // Success - show message (even if account doesn't exist for security)
      setSuccess(true);
      setEmail("");
    } catch (error) {
      console.error("Password recovery error:", error);
      setError(error instanceof Error ? error.message : "Wystąpił błąd podczas wysyłania linku");
      setLoading(false);
    } finally {
      if (!error) {
        setLoading(false);
      }
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Nie pamiętasz hasła?</CardTitle>
        <CardDescription>Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła</CardDescription>
      </CardHeader>

      {success ? (
        <>
          <CardContent>
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded" role="status">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium">Email został wysłany</p>
                  <p className="text-sm mt-1">
                    Jeśli konto z tym adresem istnieje, otrzymasz link do resetowania hasła. Link będzie ważny przez 24
                    godziny.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <a href="/auth/login" className="w-full">
              <Button variant="outline" className="w-full">
                Wróć do logowania
              </Button>
            </a>
            <button
              onClick={() => setSuccess(false)}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Wyślij ponownie
            </button>
          </CardFooter>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Adres email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.com"
                disabled={loading}
                required
                autoComplete="email"
                aria-invalid={!!error}
              />
              <p className="text-xs text-gray-600">Podaj adres email użyty podczas rejestracji</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm" role="alert">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Wysyłanie..." : "Wyślij link resetujący"}
            </Button>

            {/* Back to Login Link */}
            <div className="text-center text-sm text-gray-600">
              <a href="/auth/login" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                Wróć do logowania
              </a>
            </div>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
