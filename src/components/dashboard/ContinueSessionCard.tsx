import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardActiveSessionDTO } from "@/types";

interface ContinueSessionCardProps {
  activeSession: DashboardActiveSessionDTO;
}

/**
 * ContinueSessionCard component
 *
 * Shows summary of active exercise session with continue button
 * Only rendered when activeSession exists
 */
export function ContinueSessionCard({ activeSession }: ContinueSessionCardProps) {
  const handleContinue = () => {
    window.location.href = `/app/sessions/${activeSession.session_id}`;
  };

  // Calculate time since session started
  const startedAt = new Date(activeSession.started_at);
  const now = new Date();
  const minutesAgo = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60));

  const timeDisplay = minutesAgo < 60 ? `${minutesAgo} min temu` : `${Math.floor(minutesAgo / 60)} godz. temu`;

  return (
    <Card className="hover:shadow-md transition-shadow border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Kontynuuj sesję
        </CardTitle>
        <CardDescription>Rozpoczęta {timeDisplay}</CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-600">Masz aktywną sesję ćwiczeń. Dokończ ją, aby zobaczyć swoje wyniki.</p>
      </CardContent>

      <CardFooter>
        <Button onClick={handleContinue} variant="default" className="w-full bg-green-600 hover:bg-green-700">
          Kontynuuj
        </Button>
      </CardFooter>
    </Card>
  );
}
