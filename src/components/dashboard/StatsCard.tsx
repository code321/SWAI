import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  setsTotal: number;
}

/**
 * StatsCard component
 * 
 * Shows total number of vocabulary sets
 * Entire card is clickable and navigates to /app/sets
 */
export function StatsCard({ setsTotal }: StatsCardProps) {
  const handleClick = () => {
    window.location.href = '/app/sets';
  };

  // Determine proper Polish plural form
  const setsLabel =
    setsTotal === 1
      ? 'zestaw'
      : setsTotal >= 2 && setsTotal <= 4
      ? 'zestawy'
      : 'zestawów';

  return (
    <Card
      onClick={handleClick}
      className="hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 group-hover:text-blue-600 transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          Twoje zestawy
        </CardTitle>
        <CardDescription>
          Zobacz wszystkie swoje zestawy słówek
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">{setsTotal}</span>
          <span className="text-lg text-gray-600">{setsLabel}</span>
        </div>

        {setsTotal === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Stwórz swój pierwszy zestaw, aby rozpocząć naukę
          </p>
        )}
      </CardContent>
    </Card>
  );
}

