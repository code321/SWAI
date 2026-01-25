import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

interface LoginFormProps {
  nextUrl?: string;
}

/**
 * LoginForm component
 *
 * Handles user login with email and password
 * Validates input and calls the /api/auth/login endpoint
 * Redirects to dashboard or next URL on success
 */
export function LoginForm({ nextUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    if (!password) {
      setError("Hasło jest wymagane");
      return;
    }

    if (password.length < 8) {
      setError("Hasło musi mieć minimum 8 znaków");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        throw new Error(data.error?.message || "Nie udało się zalogować");
      }

      // Success - redirect to dashboard or next URL
      const redirectUrl = nextUrl && nextUrl !== "/" ? nextUrl : "/app/dashboard";
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : "Wystąpił błąd podczas logowania");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Zaloguj się</CardTitle>
        <CardDescription>Wprowadź swoje dane, aby uzyskać dostęp do aplikacji</CardDescription>
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
              autoComplete="current-password"
              minLength={8}
              aria-invalid={!!error}
            />
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <a
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Nie pamiętasz hasła?
            </a>
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
            {loading ? "Logowanie..." : "Zaloguj się"}
          </Button>

          {/* Register Link */}
          <div className="text-center text-sm text-gray-600">
            Nie masz konta?{" "}
            <a href="/auth/register" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
              Zarejestruj się
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
