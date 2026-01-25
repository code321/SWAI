import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

interface RegisterFormProps {
  nextUrl?: string;
}

/**
 * RegisterForm component
 *
 * Handles user registration with email and password
 * Validates input and calls the /api/auth/signup endpoint
 * Auto-logs in user and redirects to dashboard on success
 */
export function RegisterForm({ nextUrl }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

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
      // Get user timezone automatically
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          data: {
            timezone,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        throw new Error(data.error?.message || "Nie udało się utworzyć konta");
      }

      // Success - user is auto-logged in, redirect to dashboard or next URL
      const redirectUrl = nextUrl && nextUrl !== "/" ? nextUrl : "/app/dashboard";
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Registration error:", error);
      setError(error instanceof Error ? error.message : "Wystąpił błąd podczas rejestracji");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Utwórz konto</CardTitle>
        <CardDescription>Wprowadź swoje dane, aby rozpocząć naukę z SmartWordsAI</CardDescription>
      </CardHeader>

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
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
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
            <Label htmlFor="confirm-password">Powtórz hasło</Label>
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
            {loading ? "Tworzenie konta..." : "Zarejestruj się"}
          </Button>

          {/* Login Link */}
          <div className="text-center text-sm text-gray-600">
            Masz już konto?{" "}
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
              Zaloguj się
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
