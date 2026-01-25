import { useState, useEffect, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

/**
 * ResetPasswordForm component
 *
 * Handles password reset after user clicks recovery link
 * Extracts tokens from URL hash, exchanges them via API
 * Allows setting new password and redirects to login on success
 */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Extract and exchange recovery tokens from URL hash
  useEffect(() => {
    const exchangeTokens = async () => {
      try {
        // Parse hash parameters (Supabase sends tokens in hash)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (!accessToken || !refreshToken || type !== "recovery") {
          throw new Error("Link do resetowania hasła jest nieprawidłowy lub wygasł");
        }

        // Exchange tokens for HttpOnly cookies
        const response = await fetch("/api/auth/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken,
            refreshToken,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Link do resetowania hasła jest nieprawidłowy lub wygasł");
        }

        // Success - tokens exchanged, ready to reset password
        setExchanging(false);

        // Clean up URL hash
        window.history.replaceState(null, "", window.location.pathname);
      } catch (error) {
        console.error("Token exchange error:", error);
        setError(error instanceof Error ? error.message : "Wystąpił błąd podczas weryfikacji linku");
        setExchanging(false);
      }
    };

    exchangeTokens();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!password) {
      setError("Hasło jest wymagane");
      return;
    }

    if (password.length < 8) {
      setError("Hasło musi mieć minimum 8 znaków");
      return;
    }

    if (password !== confirmPassword) {
      setError("Hasła muszą być identyczne");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Nie udało się zmienić hasła");
      }

      // Success - show message and redirect to login
      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch (error) {
      console.error("Password reset error:", error);
      setError(error instanceof Error ? error.message : "Wystąpił błąd podczas zmiany hasła");
      setLoading(false);
    }
  };

  // Loading state while exchanging tokens
  if (exchanging) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Weryfikacja linku...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state if token exchange failed
  if (error && !success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Błąd weryfikacji</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded" role="alert">
            {error}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <a href="/auth/forgot-password" className="w-full">
            <Button className="w-full">Wyślij nowy link</Button>
          </a>
          <a href="/auth/login" className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors">
            Wróć do logowania
          </a>
        </CardFooter>
      </Card>
    );
  }

  // Success state
  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hasło zostało zmienione</CardTitle>
        </CardHeader>

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
                <p className="font-medium">Sukces!</p>
                <p className="text-sm mt-1">Twoje hasło zostało zmienione. Za chwilę zostaniesz przekierowany...</p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <a href="/auth/login" className="w-full">
            <Button className="w-full">Przejdź do logowania</Button>
          </a>
        </CardFooter>
      </Card>
    );
  }

  // Main form state
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Ustaw nowe hasło</CardTitle>
        <CardDescription>Wprowadź nowe hasło do swojego konta</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Nowe hasło</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 znaków"
              disabled={loading}
              required
              autoComplete="new-password"
              minLength={8}
              aria-invalid={!!error}
            />
            <p className="text-xs text-gray-600">Hasło musi zawierać co najmniej 8 znaków</p>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Powtórz nowe hasło</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Powtórz hasło"
              disabled={loading}
              required
              autoComplete="new-password"
              minLength={8}
              aria-invalid={!!error}
            />
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
            {loading ? "Zmiana hasła..." : "Zmień hasło"}
          </Button>

          {/* Cancel Link */}
          <div className="text-center text-sm text-gray-600">
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
              Anuluj
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
