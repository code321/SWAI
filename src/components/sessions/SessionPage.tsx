import { useSessionDetail } from "./hooks/useSessionDetail";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { SessionSentenceDTO } from "@/types";

interface SessionPageProps {
  sessionId: string;
}

/**
 * SessionPage component
 *
 * Main page component for exercise sessions
 * Displays sentences for translation and handles user attempts
 */
export function SessionPage({ sessionId }: SessionPageProps) {
  const { data: session, isLoading, error } = useSessionDetail(sessionId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie sesji...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Błąd</CardTitle>
          <CardDescription className="text-red-600">Nie udało się załadować sesji.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button onClick={() => (window.location.href = "/app/dashboard")} variant="outline">
            Powrót do Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return null;
  }

  const currentSentence = session.sentences[currentIndex];
  const isFinished = currentIndex >= session.sentences.length;

  const handleCheck = async () => {
    setIsChecking(true);
    // TODO: Implement API call to check answer
    // For now, just move to next sentence
    setTimeout(() => {
      setIsChecking(false);
      if (currentIndex < session.sentences.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setUserAnswer("");
      }
    }, 1000);
  };

  const handleFinish = async () => {
    // TODO: Implement session finish
    window.location.href = "/app/dashboard";
  };

  if (isFinished) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-700">Gratulacje!</CardTitle>
          <CardDescription>Ukończyłeś sesję ćwiczeń</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{session.progress.attempted}</p>
                <p className="text-sm text-gray-600">Próby</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{session.progress.correct}</p>
                <p className="text-sm text-gray-600">Poprawne</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  {session.progress.correct > 0
                    ? Math.round((session.progress.correct / session.progress.attempted) * 100)
                    : 0}
                  %
                </p>
                <p className="text-sm text-gray-600">Skuteczność</p>
              </div>
            </div>
            <Button onClick={handleFinish} className="w-full">
              Zakończ sesję
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Zdanie {currentIndex + 1} z {session.sentences.length}
            </span>
            <span className="text-sm text-gray-600">
              Poprawne: {session.progress.correct} / {session.progress.attempted}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / session.sentences.length) * 100}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* Translation Exercise */}
      <Card>
        <CardHeader>
          <CardTitle>Przetłumacz zdanie na angielski</CardTitle>
          <CardDescription>Wpisz swoje tłumaczenie i kliknij "Sprawdź"</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Polish sentence to translate */}
          <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
            <p className="text-lg font-medium text-blue-900">{currentSentence.pl_text}</p>
          </div>

          {/* Answer input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Twoje tłumaczenie:</label>
            <Input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Wpisz tłumaczenie..."
              className="text-lg"
              disabled={isChecking}
              onKeyDown={(e) => {
                if (e.key === "Enter" && userAnswer.trim()) {
                  handleCheck();
                }
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={handleCheck} disabled={!userAnswer.trim() || isChecking} className="flex-1">
              {isChecking ? "Sprawdzanie..." : "Sprawdź"}
            </Button>
            <Button onClick={() => (window.location.href = "/app/dashboard")} variant="outline">
              Porzuć
            </Button>
          </div>

          {/* Attempt status */}
          {currentSentence.latest_attempt && (
            <div
              className={`p-4 rounded-lg ${
                currentSentence.latest_attempt.is_correct
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-yellow-50 border-2 border-yellow-200"
              }`}
            >
              <p className="text-sm font-medium">
                {currentSentence.latest_attempt.is_correct
                  ? "✓ Poprawna odpowiedź!"
                  : "Próba #{currentSentence.latest_attempt.attempt_no}"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
