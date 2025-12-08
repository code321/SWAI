import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * CreateSetCard component
 * 
 * CTA card for creating a new vocabulary set
 * Navigates to /app/sets?mode=create on click
 */
export function CreateSetCard() {
  const handleCreateSet = () => {
    window.location.href = '/app/sets?mode=create';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>Utwórz nowy zestaw</CardTitle>
        <CardDescription>
          Dodaj nowe słówka i rozpocznij naukę
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>Maksymalnie 5 słówek na zestaw</span>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleCreateSet} className="w-full">
          Utwórz zestaw
        </Button>
      </CardFooter>
    </Card>
  );
}

